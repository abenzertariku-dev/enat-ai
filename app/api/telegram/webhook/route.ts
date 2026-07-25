import { NextResponse } from 'next/server'

/** Telegram webhook placeholder — handler currently disabled. */
export async function POST() {
  return NextResponse.json({ ok: true, disabled: true })
}
