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

    const transactions = await prisma.transaction.findMany({
      where: { userId },
      include: {
        customer: true
      },
      orderBy: { date: 'desc' },
      take: 50
    })

    const totalDebt = await prisma.transaction.aggregate({
      where: {
        userId,
        status: 'unpaid'
      },
      _sum: {
        amount: true
      }
    })

    const totalSales = await prisma.transaction.aggregate({
      where: {
        userId,
        status: 'paid'
      },
      _sum: {
        amount: true
      }
    })

    const topCustomers = await prisma.customer.findMany({
      where: { userId },
      orderBy: { totalDebt: 'desc' },
      take: 5
    })

    return NextResponse.json({
      transactions,
      stats: {
        totalDebt: totalDebt._sum.amount || 0,
        totalSales: totalSales._sum.amount || 0,
        totalTransactions: transactions.length,
        outstandingCustomers: topCustomers.length
      },
      topCustomers
    })
  } catch (error) {
    console.error('Dashboard Error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}