import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import { getSubscriptionSnapshot, trialEndFrom } from '@/lib/subscription'

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.split(' ')[1]

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string
    }

    let user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        businessName: true,
        phone: true,
        plan: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        premiumUntil: true,
        createdAt: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Backfill trial for existing accounts created before subscriptions
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
          name: true,
          email: true,
          businessName: true,
          phone: true,
          plan: true,
          subscriptionStatus: true,
          trialEndsAt: true,
          premiumUntil: true,
          createdAt: true,
        },
      })
    }

    const subscription = getSubscriptionSnapshot(user)

    return NextResponse.json({ user, subscription })
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid token' },
      { status: 401 }
    )
  }
}
