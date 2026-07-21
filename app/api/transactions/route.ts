import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET all transactions
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId') || 'default-user'
    
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      include: {
        customer: true
      },
      orderBy: { date: 'desc' }
    })

    return NextResponse.json({ transactions })
  } catch (error) {
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
        paymentDate: status === 'paid' ? new Date() : undefined
      },
      include: {
        customer: true
      }
    })

    return NextResponse.json({ success: true, transaction })
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}