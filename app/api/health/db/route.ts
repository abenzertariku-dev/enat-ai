import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Lightweight DB health check for deploy debugging */
export async function GET() {
  try {
    const users = await prisma.user.count()
    // #region agent log
    fetch('http://127.0.0.1:7412/ingest/e41294ac-d718-4cb0-a12d-1333a9614c42',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'31395e'},body:JSON.stringify({sessionId:'31395e',runId:'register-500',hypothesisId:'D',location:'api/health/db',message:'db health ok',data:{users,provider:'sqlite'},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return NextResponse.json({ ok: true, users })
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : String(error)
    // #region agent log
    fetch('http://127.0.0.1:7412/ingest/e41294ac-d718-4cb0-a12d-1333a9614c42',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'31395e'},body:JSON.stringify({sessionId:'31395e',runId:'register-500',hypothesisId:'D',location:'api/health/db',message:'db health failed',data:{err:errMessage.slice(0,240)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return NextResponse.json(
      { ok: false, error: errMessage.slice(0, 240) },
      { status: 500 }
    )
  }
}
