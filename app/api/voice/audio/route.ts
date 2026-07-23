import { NextRequest, NextResponse } from 'next/server'
import { extractFromAudio } from '@/lib/gemini'
import { recordTransaction } from '@/lib/transactions'
import jwt from 'jsonwebtoken'

const MAX_AUDIO_BYTES = 15 * 1024 * 1024 // 15MB — short voice clips, plenty of headroom
const ACCEPTED_TYPES = [
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  'audio/x-m4a',
  'audio/aac',
]

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
      return NextResponse.json({ error: 'No audio provided' }, { status: 400 })
    }

    if (audio.size > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: 'Recording is too large (max 15MB)' }, { status: 400 })
    }

    // Browsers report MediaRecorder mimeType inconsistently (e.g. "audio/webm;codecs=opus"),
    // so match on the base type rather than requiring an exact string.
    const baseType = audio.type.split(';')[0]
    if (baseType && !ACCEPTED_TYPES.includes(baseType)) {
      return NextResponse.json({ error: 'Unsupported audio format' }, { status: 400 })
    }

    const bytes = await audio.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')

    const extracted = await extractFromAudio(base64, baseType || 'audio/webm')

    if ('error' in extracted) {
      return NextResponse.json({ error: extracted.error }, { status: 422 })
    }

    const transaction = await recordTransaction(userId, extracted, 'voice input')

    return NextResponse.json({
      success: true,
      transaction,
      transcript: extracted.transcript,
      message: 'Transaction added successfully',
    })
  } catch (error) {
    console.error('Voice Audio Error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}