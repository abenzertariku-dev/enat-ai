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

    const customers = await prisma.customer.findMany({
      where: { userId },
      orderBy: { totalDebt: 'desc' },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        totalDebt: true,
        totalPaid: true,
        _count: { select: { transactions: true } },
      },
    })

    return NextResponse.json({
      customers: customers.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        totalDebt: c.totalDebt,
        totalPaid: c.totalPaid,
        transactionCount: c._count.transactions,
      })),
    })
  } catch (error) {
    console.error('Customers Error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}