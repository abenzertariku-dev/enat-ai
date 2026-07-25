import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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

// ─── GET: Fetch all alerts ────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const userId = getUserId(req)
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const unreadOnly = searchParams.get('unread') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: any = { userId }
    if (unreadOnly) {
      where.isRead = false
    }

    const alerts = await prisma.stockAlert.findMany({
      where,
      include: {
        stockItem: {
          select: {
            id: true,
            name: true,
            quantity: true,
            unit: true,
            minQuantity: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    // Get counts
    const totalCount = await prisma.stockAlert.count({ where: { userId } })
    const unreadCount = await prisma.stockAlert.count({ 
      where: { userId, isRead: false } 
    })

    return NextResponse.json({
      alerts,
      counts: {
        total: totalCount,
        unread: unreadCount,
        read: totalCount - unreadCount,
      }
    })
  } catch (error) {
    console.error('Alerts GET Error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// ─── PUT: Mark alerts as read ─────────────────────────────────────────

export async function PUT(req: NextRequest) {
  try {
    const userId = getUserId(req)
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { alertIds, markAll } = await req.json()

    // If markAll is true, mark all alerts as read
    if (markAll) {
      const result = await prisma.stockAlert.updateMany({
        where: {
          userId,
          isRead: false,
        },
        data: { isRead: true },
      })

      return NextResponse.json({
        success: true,
        marked: result.count,
        message: `Marked ${result.count} alerts as read`
      })
    }

    // Otherwise, mark specific alerts
    if (!alertIds || !Array.isArray(alertIds) || alertIds.length === 0) {
      return NextResponse.json({ 
        error: 'alertIds array or markAll=true required' 
      }, { status: 400 })
    }

    const result = await prisma.stockAlert.updateMany({
      where: {
        id: { in: alertIds },
        userId,
      },
      data: { isRead: true },
    })

    return NextResponse.json({
      success: true,
      marked: result.count,
      message: `Marked ${result.count} alerts as read`
    })
  } catch (error) {
    console.error('Alerts PUT Error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// ─── DELETE: Delete alerts ────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const userId = getUserId(req)
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const alertId = searchParams.get('id')
    const deleteAll = searchParams.get('all') === 'true'

    // If deleteAll is true, delete all read alerts
    if (deleteAll) {
      const result = await prisma.stockAlert.deleteMany({
        where: {
          userId,
          isRead: true,
        },
      })

      return NextResponse.json({
        success: true,
        deleted: result.count,
        message: `Deleted ${result.count} read alerts`
      })
    }

    // Delete a specific alert
    if (!alertId) {
      return NextResponse.json({ 
        error: 'Alert ID required or all=true' 
      }, { status: 400 })
    }

    // Verify alert belongs to user
    const alert = await prisma.stockAlert.findFirst({
      where: { id: alertId, userId }
    })

    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
    }

    await prisma.stockAlert.delete({
      where: { id: alertId }
    })

    return NextResponse.json({
      success: true,
      message: 'Alert deleted successfully'
    })
  } catch (error) {
    console.error('Alerts DELETE Error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}