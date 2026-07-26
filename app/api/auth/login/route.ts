import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { getSubscriptionSnapshot, trialEndFrom } from '@/lib/subscription'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

let dummyHash: string | null = null
function getDummyHash() {
  if (!dummyHash) dummyHash = bcrypt.hashSync('no-such-user-timing-guard', 10)
  return dummyHash
}

export async function GET() {
  return NextResponse.json({ ok: true, route: '/api/auth/login', methods: ['POST'] })
}

export async function POST(req: NextRequest) {
  // #region agent log
  fetch('http://127.0.0.1:7412/ingest/e41294ac-d718-4cb0-a12d-1333a9614c42',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'31395e'},body:JSON.stringify({sessionId:'31395e',runId:'auth-404',hypothesisId:'B',location:'auth/login/route.ts:POST',message:'login POST handler entered',data:{method:req.method,url:req.url,hasJwt:Boolean(process.env.JWT_SECRET)},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  try {
    if (!process.env.JWT_SECRET) {
      console.error('Login Error: JWT_SECRET is not set')
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    const body = await req.json()
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''

    if (!email || !password) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    let user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        businessName: true,
        phone: true,
        password: true,
        plan: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        premiumUntil: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    const isValid = await bcrypt.compare(password, user?.password ?? getDummyHash())

    if (!user || !isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    if (!user.trialEndsAt) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          plan: user.plan || 'trial',
          subscriptionStatus: user.subscriptionStatus || 'trialing',
          trialEndsAt: trialEndFrom(user.createdAt),
        },
        select: {
          id: true,
          email: true,
          name: true,
          businessName: true,
          phone: true,
          password: true,
          plan: true,
          subscriptionStatus: true,
          trialEndsAt: true,
          premiumUntil: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    })

    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json({
      success: true,
      token,
      user: userWithoutPassword,
      subscription: getSubscriptionSnapshot(user),
    })
  } catch (error) {
    console.error('Login Error:', error)
    // #region agent log
    fetch('http://127.0.0.1:7412/ingest/e41294ac-d718-4cb0-a12d-1333a9614c42',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'31395e'},body:JSON.stringify({sessionId:'31395e',runId:'auth-404',hypothesisId:'C',location:'auth/login/route.ts:catch',message:'login threw',data:{err:error instanceof Error?error.message:String(error)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
