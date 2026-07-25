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

// GET all transactions
export async function GET(req: NextRequest) {
  try {
    const userId = getUserId(req) || req.nextUrl.searchParams.get('userId') || 'default-user'

    const transactions = await prisma.transaction.findMany({
      where: { userId },
      include: {
        customer: true,
      },
      orderBy: { date: 'desc' },
    })

    return NextResponse.json({ transactions })
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// CREATE transaction manually
export async function POST(req: NextRequest) {
  try {
    const userId = getUserId(req)
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json()
    const customerName = String(body.customerName || '').trim()
    const product = String(body.product || '').trim()
    const amount = Number(body.amount)
    const quantity = Number(body.quantity) || 1
    const type = body.type === 'debit' ? 'debit' : 'credit'
    const status =
      body.status === 'paid' || body.status === 'unpaid'
        ? body.status
        : type === 'credit'
          ? 'unpaid'
          : 'paid'

    if (!customerName || !product || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Customer name, product, and a valid amount are required' },
        { status: 400 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      let customer = await tx.customer.findFirst({
        where: { name: customerName, userId },
      })

      if (!customer) {
        customer = await tx.customer.create({
          data: {
            name: customerName,
            userId,
            totalDebt: 0,
            totalPaid: 0,
          },
        })
      }

      const transaction = await tx.transaction.create({
        data: {
          customerId: customer.id,
          userId,
          product,
          quantity,
          amount,
          type,
          status,
          description: `Manual entry: ${customerName} — ${product}`,
          source: 'manual',
          paymentDate: status === 'paid' ? new Date() : null,
        },
        include: { customer: true },
      })

      if (type === 'credit' && status === 'unpaid') {
        await tx.customer.update({
          where: { id: customer.id },
          data: { totalDebt: { increment: amount } },
        })
      } else if (type === 'debit' || status === 'paid') {
        await tx.customer.update({
          where: { id: customer.id },
          data: { totalPaid: { increment: amount } },
        })
      }

      return transaction
    })

    return NextResponse.json({ success: true, transaction: result })
  } catch (error) {
    console.error('Transaction POST Error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// UPDATE transaction (e.g., mark as paid)
export async function PUT(req: NextRequest) {
  try {
    const { id, status } = await req.json()

    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        status,
        paymentDate: status === 'paid' ? new Date() : undefined,
      },
      include: {
        customer: true,
      },
    })

    return NextResponse.json({ success: true, transaction })
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
