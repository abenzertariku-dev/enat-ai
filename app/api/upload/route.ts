import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extractFromImage } from '@/lib/gemini'
import jwt from 'jsonwebtoken'

// Helper to get user from token
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

export async function POST(req: NextRequest) {
  try {
    const userId = getUserId(req)
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const formData = await req.formData()
    const image = formData.get('image') as File

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    // Convert image to base64
    const bytes = await image.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString('base64')

    // AI Extraction
    const extracted = await extractFromImage(base64)
    
    if (extracted.error) {
      return NextResponse.json({ error: extracted.error }, { status: 400 })
    }

    // Get or create customer (scoped to user)
    let customer = await prisma.customer.findFirst({
      where: {
        name: extracted.customerName,
        userId: userId
      }
    })

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: extracted.customerName,
          userId: userId,
          totalDebt: 0,
          totalPaid: 0
        }
      })
    }

    // Create transaction
    const transaction = await prisma.transaction.create({
      data: {
        customerId: customer.id,
        userId: userId,
        product: extracted.product,
        quantity: extracted.quantity || 1,
        amount: extracted.amount,
        type: extracted.type,
        status: extracted.type === 'credit' ? 'unpaid' : 'paid',
        description: extracted.description || 'From image upload'
      },
      include: {
        customer: true
      }
    })

    // Update customer totals
    if (extracted.type === 'credit') {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { totalDebt: { increment: extracted.amount } }
      })
    } else {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { totalPaid: { increment: extracted.amount } }
      })
    }

    return NextResponse.json({ 
      success: true, 
      transaction,
      message: 'Transaction added successfully'
    })
  } catch (error) {
    console.error('Upload Error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}