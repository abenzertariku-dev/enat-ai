import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { getSubscriptionSnapshot, trialEndFrom } from '@/lib/subscription'

const DUMMY_HASH = bcrypt.hashSync('no-such-user-timing-guard', 10)

export async function POST(req: NextRequest) {
  try {
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

    const isValid = await bcrypt.compare(password, user?.password ?? DUMMY_HASH)

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

    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET!, {
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
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
