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

// ─── GET: Fetch all sales (with optional filters) ────────────────────

export async function GET(req: NextRequest) {
  try {
    const userId = getUserId(req)
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const stockItemId = searchParams.get('stockItemId')

    const where: any = { userId }
    
    if (stockItemId) {
      where.stockItemId = stockItemId
    }
    
    if (startDate || endDate) {
      where.date = {}
      if (startDate) where.date.gte = new Date(startDate)
      if (endDate) where.date.lte = new Date(endDate)
    }

    const sales = await prisma.stockSale.findMany({
      where,
      include: {
        stockItem: {
          select: {
            id: true,
            name: true,
            unit: true,
          }
        }
      },
      orderBy: { date: 'desc' },
      take: limit,
    })

    // Get total sales summary
    const summary = await prisma.stockSale.aggregate({
      where,
      _sum: {
        quantity: true,
        totalAmount: true,
      },
      _count: true,
    })

    return NextResponse.json({
      sales,
      summary: {
        totalItems: summary._count,
        totalQuantity: summary._sum.quantity || 0,
        totalAmount: summary._sum.totalAmount || 0,
      }
    })
  } catch (error) {
    console.error('Sales GET Error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// ─── POST: Record sales ──────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const userId = getUserId(req)
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { sales } = await req.json()

    if (!sales || !Array.isArray(sales) || sales.length === 0) {
      return NextResponse.json({ error: 'No sales provided' }, { status: 400 })
    }

    const results = []
    const errors = []

    for (const sale of sales) {
      const { stockItemId, quantity, sellingPrice, note } = sale

      if (!stockItemId || !quantity || quantity <= 0) {
        errors.push({ 
          error: 'Invalid sale data', 
          stockItemId, 
          quantity 
        })
        continue
      }

      try {
        const result = await prisma.$transaction(async (tx) => {
          // Get the stock item with lock
          const item = await tx.stockItem.findFirst({
            where: { id: stockItemId, userId }
          })

          if (!item) {
            return { 
              success: false, 
              error: `Item not found`, 
              stockItemId 
            }
          }

          if (item.quantity < quantity) {
            return { 
              success: false, 
              error: `Insufficient stock for ${item.name}. Available: ${item.quantity}`,
              stockItemId,
              available: item.quantity
            }
          }

          const finalPrice = sellingPrice || item.sellingPrice || 0
          const totalAmount = quantity * finalPrice

          // Create sale record
          const saleRecord = await tx.stockSale.create({
            data: {
              userId,
              stockItemId,
              quantity,
              sellingPrice: finalPrice,
              totalAmount,
              note: note || `Sold ${quantity} ${item.unit || 'units'} of ${item.name}`,
            },
            include: {
              stockItem: {
                select: {
                  id: true,
                  name: true,
                  unit: true,
                }
              }
            }
          })

          // Update stock quantity
          const updatedItem = await tx.stockItem.update({
            where: { id: stockItemId },
            data: { 
              quantity: { decrement: quantity } 
            },
          })

          // ✅ CREATE TRANSACTION for stock sale
          await tx.transaction.create({
            data: {
              userId,
              customerId: null,
              product: item.name,
              quantity: quantity,
              amount: totalAmount,
              type: 'credit',
              status: 'paid',
              description: `🛒 Sold ${quantity} ${item.unit || 'units'} of ${item.name} (${finalPrice} Br each)`,
              source: 'stock_out',
              stockItemId: updatedItem.id,
            }
          })

          // Check stock level after sale (creates alerts if needed)
          await checkStockLevel(tx, userId, stockItemId)

          return { 
            success: true, 
            sale: saleRecord, 
            item: updatedItem 
          }
        })

        if (result.success) {
          results.push(result)
        } else {
          errors.push(result)
        }
      } catch (error) {
        console.error('Sale Transaction Error:', error)
        errors.push({ 
          error: 'Transaction failed', 
          stockItemId, 
          details: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Prepare response
    const response: any = {
      success: results.length > 0,
      processed: results.length,
      failed: errors.length,
    }

    if (results.length > 0) {
      response.results = results.map(r => ({
        success: true,
        sale: r.sale,
        item: r.item,
      }))
    }

    if (errors.length > 0) {
      response.errors = errors
    }

    // Add summary
    response.summary = {
      totalSalesRecorded: results.length,
      totalErrors: errors.length,
      totalAmount: results.reduce((sum, r) => sum + (r.sale?.totalAmount || 0), 0),
      totalQuantity: results.reduce((sum, r) => sum + (r.sale?.quantity || 0), 0),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Sales POST Error:', error)
    return NextResponse.json({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// ─── DELETE: Cancel/remove a sale ────────────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const userId = getUserId(req)
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const saleId = searchParams.get('id')

    if (!saleId) {
      return NextResponse.json({ error: 'Sale ID required' }, { status: 400 })
    }

    // Use transaction to revert stock and delete sale
    const result = await prisma.$transaction(async (tx) => {
      // Get the sale
      const sale = await tx.stockSale.findFirst({
        where: { id: saleId, userId },
        include: { stockItem: true }
      })

      if (!sale) {
        return { error: 'Sale not found' }
      }

      // Restore stock quantity
      const restoredItem = await tx.stockItem.update({
        where: { id: sale.stockItemId },
        data: { quantity: { increment: sale.quantity } }
      })

      // Delete the sale record
      await tx.stockSale.delete({
        where: { id: saleId }
      })

      // ✅ Create transaction for sale cancellation
      await tx.transaction.create({
        data: {
          userId,
          customerId: null,
          product: sale.stockItem.name,
          quantity: sale.quantity,
          amount: -sale.totalAmount, // Negative amount to reverse
          type: 'debit',
          status: 'paid',
          description: `↩️ Cancelled sale of ${sale.quantity} ${sale.stockItem.unit || 'units'} of ${sale.stockItem.name}`,
          source: 'stock_out',
          stockItemId: sale.stockItemId,
        }
      })

      // Check stock level after restoration
      await checkStockLevel(tx, userId, sale.stockItemId)

      return { 
        success: true, 
        message: `Sale cancelled. ${sale.quantity} ${sale.stockItem.unit || 'units'} of ${sale.stockItem.name} restored.`,
        restoredItem
      }
    })

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 404 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Sales DELETE Error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}