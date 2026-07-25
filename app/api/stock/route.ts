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

// ─── GET: Fetch all stock items ──────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const userId = getUserId(req)
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const items = await prisma.stockItem.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
      include: {
        sales: {
          orderBy: { date: 'desc' },
          take: 5
        }
      }
    })

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Stock GET Error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// ─── POST: Create stock items (bulk) ─────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const userId = getUserId(req)
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { items } = await req.json()

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 })
    }

    // Process each item
    const results = []
    for (const item of items) {
      const { name, quantity, unit, sellingPrice, purchasePrice, minQuantity, category, description } = item

      // Check if item already exists
      const existing = await prisma.stockItem.findFirst({
        where: {
          userId,
          name: { equals: name, mode: 'insensitive' }
        }
      })

      if (existing) {
        // Update existing item
        const updated = await prisma.stockItem.update({
          where: { id: existing.id },
          data: {
            quantity: existing.quantity + (quantity || 0),
            sellingPrice: sellingPrice || existing.sellingPrice,
            purchasePrice: purchasePrice || existing.purchasePrice,
            minQuantity: minQuantity || existing.minQuantity,
            unit: unit || existing.unit,
            category: category || existing.category,
            description: description || existing.description,
          }
        })
        results.push({ action: 'updated', item: updated })
      } else {
        // Create new item
        const created = await prisma.stockItem.create({
          data: {
            userId,
            name,
            quantity: quantity || 0,
            unit: unit || 'units',
            sellingPrice: sellingPrice || 0,
            purchasePrice: purchasePrice || 0,
            minQuantity: minQuantity || 5,
            category: category || 'Uncategorized',
            description: description || '',
          }
        })
        results.push({ action: 'created', item: created })
      }
    }

    // Check for low stock alerts
    await checkLowStockAlerts(userId)

    return NextResponse.json({
      success: true,
      results,
      message: `${results.length} items processed`
    })
  } catch (error) {
    console.error('Stock POST Error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// ─── PUT: Update stock item ──────────────────────────────────────────

export async function PUT(req: NextRequest) {
  try {
    const userId = getUserId(req)
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { id, ...data } = await req.json()

    if (!id) {
      return NextResponse.json({ error: 'Item ID required' }, { status: 400 })
    }

    const item = await prisma.stockItem.update({
      where: { id },
      data,
    })

    // Check for low stock alerts
    await checkLowStockAlerts(userId)

    return NextResponse.json({ success: true, item })
  } catch (error) {
    console.error('Stock PUT Error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// ─── DELETE: Remove stock item ──────────────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const userId = getUserId(req)
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Item ID required' }, { status: 400 })
    }

    await prisma.stockItem.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Stock DELETE Error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// ─── Helper: Check Low Stock Alerts ─────────────────────────────────

async function checkLowStockAlerts(userId: string) {
  const items = await prisma.stockItem.findMany({
    where: { userId }
  })

  for (const item of items) {
    const isLow = item.quantity <= (item.minQuantity || 5)
    const isOut = item.quantity <= 0

    if (isLow || isOut) {
      // Check if alert already exists
      const existingAlert = await prisma.stockAlert.findFirst({
        where: {
          userId,
          stockItemId: item.id,
          isRead: false
        }
      })

      if (!existingAlert) {
        const message = isOut 
          ? `🚨 ${item.name} is OUT OF STOCK! Please restock immediately.`
          : `⚠️ ${item.name} is running low (${item.quantity} ${item.unit || 'units'} remaining). Consider restocking.`
        
        await prisma.stockAlert.create({
          data: {
            userId,
            stockItemId: item.id,
            type: isOut ? 'out_of_stock' : 'low_stock',
            message,
          }
        })
      }
    }
  }
}