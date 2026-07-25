import { NextRequest, NextResponse } from 'next/server'

/** Chapa server-to-server callback — acknowledges receipt */
export async function GET(req: NextRequest) {
  const txRef = req.nextUrl.searchParams.get('trx_ref') || req.nextUrl.searchParams.get('tx_ref')
  return NextResponse.json({ received: true, txRef })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    return NextResponse.json({ received: true, body })
  } catch {
    return NextResponse.json({ received: true })
  }
}
