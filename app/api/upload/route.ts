import { NextRequest, NextResponse } from 'next/server'
import { extractFromImage } from '@/lib/gemini'
import { recordTransaction } from '@/lib/transactions'
import jwt from 'jsonwebtoken'

const MAX_IMAGE_BYTES = 8 * 1024 * 1024 // 8MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']

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
    const image = formData.get('image') as File | null

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    if (image.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Image is too large (max 8MB)' }, { status: 400 })
    }

    if (image.type && !ACCEPTED_TYPES.includes(image.type)) {
      return NextResponse.json({ error: 'Unsupported image type' }, { status: 400 })
    }

    const bytes = await image.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')

    const extracted = await extractFromImage(base64, image.type || 'image/jpeg')

    if ('error' in extracted) {
      return NextResponse.json({ error: extracted.error }, { status: 422 })
    }

    const transaction = await recordTransaction(userId, extracted, 'image upload')

    return NextResponse.json({
      success: true,
      transaction,
      message: 'Transaction added successfully',
    })
  } catch (error) {
    console.error('Upload Error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}