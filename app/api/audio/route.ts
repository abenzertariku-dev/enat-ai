import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extractFromAudio } from '@/lib/gemini'
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

export async function POST(req: NextRequest) {
  try {
    const userId = getUserId(req)
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const formData = await req.formData()
    const audio = formData.get('audio') as File

    if (!audio) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }

    // Convert audio to base64
    const bytes = await audio.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString('base64')
    const mimeType = audio.type || 'audio/webm'

    // AI Extraction from audio
    const extracted = await extractFromAudio(base64, mimeType)

    if ('error' in extracted) {
      return NextResponse.json({ error: extracted.error }, { status: 400 })
    }

    // Get or create customer
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
        description: extracted.description || 'From audio input'
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
      transcript: extracted.transcript,
      message: 'Transaction added successfully from audio'
    })
  } catch (error) {
    console.error('Audio Error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}