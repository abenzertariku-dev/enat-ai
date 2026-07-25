import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import { checkStockLevel } from '@/lib/stock'

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

    const results = []
    for (const item of items) {
      const { name, quantity, unit, sellingPrice, purchasePrice, minQuantity, category, description } = item

      // Use a transaction to ensure consistency
      const result = await prisma.$transaction(async (tx) => {
        // Get all items for case-insensitive check (SQLite doesn't support mode: 'insensitive')
        const allItems = await tx.stockItem.findMany({
          where: { userId },
          select: { 
            id: true, 
            name: true, 
            quantity: true, 
            sellingPrice: true, 
            purchasePrice: true, 
            minQuantity: true, 
            unit: true, 
            category: true, 
            description: true 
          }
        })

        const existing = allItems.find(
          (i) => i.name.toLowerCase() === name.toLowerCase()
        )

        let itemResult
        if (existing) {
          itemResult = await tx.stockItem.update({
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

          // ✅ Create transaction for stock addition (update)
          await tx.transaction.create({
            data: {
              userId,
              customerId: null,
              product: name,
              quantity: quantity || 0,
              amount: (quantity || 0) * (purchasePrice || 0),
              type: 'debit',
              status: 'paid',
              description: `📦 Added ${quantity || 0} ${unit || 'units'} of ${name} to stock (updated)`,
              source: 'stock_in',
              stockItemId: existing.id,
            }
          })

          // Check stock level after update
          await checkStockLevel(tx, userId, existing.id)
        } else {
          const created = await tx.stockItem.create({
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

          // ✅ Create transaction for new stock
          await tx.transaction.create({
            data: {
              userId,
              customerId: null,
              product: name,
              quantity: quantity || 0,
              amount: (quantity || 0) * (purchasePrice || 0),
              type: 'debit',
              status: 'paid',
              description: `📦 Added ${quantity || 0} ${unit || 'units'} of ${name} to stock (new)`,
              source: 'stock_in',
              stockItemId: created.id,
            }
          })

          // Check stock level after creation
          await checkStockLevel(tx, userId, created.id)
          itemResult = created
        }

        return { action: existing ? 'updated' : 'created', item: itemResult }
      })

      results.push(result)
    }

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

    // Use transaction for consistency
    const item = await prisma.$transaction(async (tx) => {
      const updated = await tx.stockItem.update({
        where: { id },
        data,
      })

      // ✅ Create transaction for stock update (if quantity changed)
      if (data.quantity !== undefined) {
        await tx.transaction.create({
          data: {
            userId,
            customerId: null,
            product: updated.name,
            quantity: data.quantity || 0,
            amount: 0,
            type: 'debit',
            status: 'paid',
            description: `📝 Updated stock: ${updated.name} to ${data.quantity} ${updated.unit || 'units'}`,
            source: 'stock_in',
            stockItemId: id,
          }
        })
      }

      // Check stock level after update
      await checkStockLevel(tx, userId, id)
      return updated
    })

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

    // Check if item exists and belongs to user
    const item = await prisma.stockItem.findFirst({
      where: { id, userId }
    })

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // Delete the item (cascade will delete sales and alerts)
    await prisma.stockItem.delete({
      where: { id }
    })

    // ✅ Create transaction for deletion
    await prisma.transaction.create({
      data: {
        userId,
        customerId: null,
        product: item.name,
        quantity: 0,
        amount: 0,
        type: 'debit',
        status: 'paid',
        description: `🗑️ Removed ${item.name} from stock`,
        source: 'stock_in',
        stockItemId: id,
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Stock DELETE Error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}