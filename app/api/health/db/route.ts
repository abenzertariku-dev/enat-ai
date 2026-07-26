import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Lightweight DB health check for deploy debugging */
export async function GET() {
  try {
    const users = await prisma.user.count()
    return NextResponse.json({ ok: true, users })
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { ok: false, error: errMessage.slice(0, 240) },
      { status: 500 }
    )
  }
}
