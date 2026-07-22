import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

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

export async function GET(req: NextRequest) {
  try {
    const userId = getUserId(req)
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)

    const [
      transactions,
      totalDebt,
      todaysSales,
      totalTransactionsCount,
      outstandingCustomersCount,
      topCustomers,
    ] = await Promise.all([
      // Recent activity for the list + trend chart (kept at 50 for payload size)
      prisma.transaction.findMany({
        where: { userId },
        include: { customer: true },
        orderBy: { date: 'desc' },
        take: 50,
      }),

      // Total currently owed across ALL unpaid transactions (not date-scoped —
      // outstanding debt doesn't reset daily the way sales does)
      prisma.transaction.aggregate({
        where: { userId, status: 'unpaid' },
        _sum: { amount: true },
      }),

      // Sales collected TODAY only, matching the "Today's Sales" label
      prisma.transaction.aggregate({
        where: { userId, status: 'paid', date: { gte: startOfToday } },
        _sum: { amount: true },
      }),

      // Real total, not limited by the `take: 50` above
      prisma.transaction.count({ where: { userId } }),

      // Only customers who actually owe something
      prisma.customer.count({ where: { userId, totalDebt: { gt: 0 } } }),

      // Authoritative debt ranking, from Customer.totalDebt rather than
      // recomputed client-side from a limited transaction slice
      prisma.customer.findMany({
        where: { userId, totalDebt: { gt: 0 } },
        orderBy: { totalDebt: 'desc' },
        take: 5,
        select: { id: true, name: true, totalDebt: true },
      }),
    ])

    return NextResponse.json({
      transactions,
      stats: {
        totalDebt: totalDebt._sum.amount || 0,
        totalSales: todaysSales._sum.amount || 0,
        totalTransactions: totalTransactionsCount,
        outstandingCustomers: outstandingCustomersCount,
      },
      topCustomers,
    })
  } catch (error) {
    console.error('Dashboard Error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}