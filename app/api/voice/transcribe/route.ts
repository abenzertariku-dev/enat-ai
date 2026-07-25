import { NextRequest, NextResponse } from 'next/server'
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
    const audio = formData.get('audio') as File | null

    if (!audio) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }

    // Convert audio to base64
    const bytes = await audio.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString('base64')
    const mimeType = audio.type || 'audio/webm'

    // Extract transaction from audio
    const extracted = await extractFromAudio(base64, mimeType)

    if ('error' in extracted) {
      return NextResponse.json({ error: extracted.error }, { status: 400 })
    }

    // Return the extracted data for review
    return NextResponse.json({
      transcript: extracted.transcript || '',
      extracted: {
        customerName: extracted.customerName,
        product: extracted.product,
        quantity: extracted.quantity,
        amount: extracted.amount,
        type: extracted.type,
        description: extracted.description || '',
      },
      confidence: 0.85
    })
  } catch (error) {
    console.error('Transcribe Error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}