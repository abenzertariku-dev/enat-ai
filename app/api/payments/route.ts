import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import {
  addMonths,
  getSubscriptionSnapshot,
  makeTxRef,
  PREMIUM_MONTHS,
  PREMIUM_PRICE_ETB,
} from '@/lib/subscription'

function getUserId(req: NextRequest): string | null {
  try {
    const token = req.headers.get('authorization')?.split(' ')[1]
    if (!token) return null
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
    return decoded.userId
  } catch {
    return null
  }
}

async function loadUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      plan: true,
      subscriptionStatus: true,
      trialEndsAt: true,
      premiumUntil: true,
    },
  })
}

export async function GET(req: NextRequest) {
  const userId = getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const user = await loadUser(userId)
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Sync expired status in DB when trial/premium lapses
  const snap = getSubscriptionSnapshot(user)
  if (snap.requiresUpgrade && user.subscriptionStatus !== 'expired') {
    await prisma.user.update({
      where: { id: userId },
      data: { subscriptionStatus: 'expired', plan: user.plan === 'premium' ? 'premium' : 'trial' },
    })
  }

  return NextResponse.json({
    subscription: getSubscriptionSnapshot(user),
    priceEtb: PREMIUM_PRICE_ETB,
    providers: ['chapa', 'telebirr'],
  })
}

export async function POST(req: NextRequest) {
  try {
    const userId = getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const user = await loadUser(userId)
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const body = await req.json()
    const provider = body.provider === 'telebirr' ? 'telebirr' : body.provider === 'chapa' ? 'chapa' : null
    if (!provider) {
      return NextResponse.json({ error: 'Choose Chapa or Telebirr' }, { status: 400 })
    }

    const origin = req.headers.get('origin') || process.env.APP_URL || 'http://localhost:3000'
    const txRef = makeTxRef(provider === 'chapa' ? 'chapa' : 'tele')
    const amount = PREMIUM_PRICE_ETB

    const payment = await prisma.payment.create({
      data: {
        userId,
        provider,
        amount,
        currency: 'ETB',
        status: 'pending',
        txRef,
        phone: typeof body.phone === 'string' ? body.phone : user.phone,
      },
    })

    if (provider === 'chapa') {
      const secret = process.env.CHAPA_SECRET_KEY
      if (secret) {
        const [firstName, ...rest] = (user.name || 'ENAT').split(' ')
        const res = await fetch('https://api.chapa.co/v1/transaction/initialize', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${secret}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: String(amount),
            currency: 'ETB',
            email: user.email,
            first_name: firstName,
            last_name: rest.join(' ') || 'User',
            phone_number: payment.phone || undefined,
            tx_ref: txRef,
            callback_url: `${origin}/api/payments/chapa/callback`,
            return_url: `${origin}/upgrade/checkout?provider=chapa&tx_ref=${txRef}`,
            customization: {
              title: 'ENAT AI Premium',
              description: '1 month premium subscription',
            },
          }),
        })
        const data = await res.json()
        if (!res.ok || data.status !== 'success' || !data.data?.checkout_url) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'failed', meta: JSON.stringify(data) },
          })
          return NextResponse.json(
            { error: data.message || 'Chapa initialization failed' },
            { status: 502 }
          )
        }

        await prisma.payment.update({
          where: { id: payment.id },
          data: { checkoutUrl: data.data.checkout_url, meta: JSON.stringify(data) },
        })

        return NextResponse.json({
          success: true,
          provider: 'chapa',
          txRef,
          checkoutUrl: data.data.checkout_url,
          amount,
        })
      }

      // Dev / no-key mode: simulated hosted checkout page
      const checkoutUrl = `${origin}/upgrade/checkout?provider=chapa&tx_ref=${txRef}`
      await prisma.payment.update({
        where: { id: payment.id },
        data: { checkoutUrl, meta: JSON.stringify({ mode: 'simulated' }) },
      })
      return NextResponse.json({
        success: true,
        provider: 'chapa',
        txRef,
        checkoutUrl,
        amount,
        simulated: true,
      })
    }

    // Telebirr
    const phone = typeof body.phone === 'string' ? body.phone.trim() : user.phone
    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required for Telebirr' },
        { status: 400 }
      )
    }

    const checkoutUrl = `${origin}/upgrade/checkout?provider=telebirr&tx_ref=${txRef}`
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        phone,
        checkoutUrl,
        meta: JSON.stringify({
          mode: process.env.TELEBIRR_APP_ID ? 'live-pending' : 'simulated',
          note: 'Complete payment with Telebirr',
        }),
      },
    })

    return NextResponse.json({
      success: true,
      provider: 'telebirr',
      txRef,
      checkoutUrl,
      amount,
      phone,
      simulated: !process.env.TELEBIRR_APP_ID,
    })
  } catch (error) {
    console.error('Payment init error:', error)
    return NextResponse.json({ error: 'Failed to start payment' }, { status: 500 })
  }
}

const MAX_PROOF_BYTES = 8 * 1024 * 1024
const PROOF_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']

/** Confirm / verify a payment — requires screenshot proof */
export async function PUT(req: NextRequest) {
  try {
    const userId = getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const contentType = req.headers.get('content-type') || ''
    let txRef = ''
    let proofImage: string | null = null

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData()
      txRef = String(form.get('txRef') || '')
      const proof = form.get('proof')
      if (proof instanceof File) {
        if (proof.size > MAX_PROOF_BYTES) {
          return NextResponse.json({ error: 'Proof image is too large (max 8MB)' }, { status: 400 })
        }
        if (proof.type && !PROOF_TYPES.includes(proof.type)) {
          return NextResponse.json({ error: 'Proof must be JPG, PNG, WebP, or HEIC' }, { status: 400 })
        }
        const bytes = await proof.arrayBuffer()
        const mime = proof.type || 'image/jpeg'
        proofImage = `data:${mime};base64,${Buffer.from(bytes).toString('base64')}`
      }
    } else {
      const body = await req.json()
      txRef = body.txRef || ''
      if (typeof body.proofImage === 'string' && body.proofImage.startsWith('data:image/')) {
        proofImage = body.proofImage
      }
    }

    if (!txRef) return NextResponse.json({ error: 'tx_ref required' }, { status: 400 })
    if (!proofImage) {
      return NextResponse.json(
        { error: 'Payment screenshot proof is required' },
        { status: 400 }
      )
    }

    const payment = await prisma.payment.findFirst({
      where: { txRef, userId },
    })
    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    if (payment.status === 'success') {
      const user = await loadUser(userId)
      return NextResponse.json({
        success: true,
        alreadyPaid: true,
        subscription: user ? getSubscriptionSnapshot(user) : null,
      })
    }

    if (payment.provider === 'chapa' && process.env.CHAPA_SECRET_KEY) {
      const verify = await fetch(
        `https://api.chapa.co/v1/transaction/verify/${encodeURIComponent(txRef)}`,
        {
          headers: { Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}` },
        }
      )
      const data = await verify.json()
      const ok =
        verify.ok &&
        (data?.data?.status === 'success' || data?.status === 'success')
      if (!ok) {
        return NextResponse.json(
          { error: 'Payment not completed yet', details: data },
          { status: 402 }
        )
      }
    }

    const premiumUntil = addMonths(new Date(), PREMIUM_MONTHS)
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'success', proofImage },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          plan: 'premium',
          subscriptionStatus: 'active',
          premiumUntil,
        },
      }),
    ])

    const user = await loadUser(userId)
    return NextResponse.json({
      success: true,
      subscription: user ? getSubscriptionSnapshot(user) : null,
    })
  } catch (error) {
    console.error('Payment confirm error:', error)
    return NextResponse.json({ error: 'Failed to confirm payment' }, { status: 500 })
  }
}
