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
    for (const sale of sales) {
      const { stockItemId, quantity, sellingPrice, note } = sale

      // Get the stock item
      const item = await prisma.stockItem.findFirst({
        where: { id: stockItemId, userId }
      })

      if (!item) {
        results.push({ error: `Item ${stockItemId} not found`, stockItemId })
        continue
      }

      if (item.quantity < quantity) {
        results.push({ 
          error: `Insufficient stock for ${item.name}. Available: ${item.quantity}`,
          stockItemId,
          available: item.quantity
        })
        continue
      }

      // Create sale record and update stock in a transaction
      const result = await prisma.$transaction(async (tx) => {
        const saleRecord = await tx.stockSale.create({
          data: {
            userId,
            stockItemId,
            quantity,
            sellingPrice: sellingPrice || item.sellingPrice || 0,
            totalAmount: quantity * (sellingPrice || item.sellingPrice || 0),
            note: note || `Sold ${quantity} ${item.unit || 'units'}`
          }
        })

        const updatedItem = await tx.stockItem.update({
          where: { id: stockItemId },
          data: { quantity: { decrement: quantity } }
        })

        return { sale: saleRecord, item: updatedItem }
      })

      results.push({ success: true, ...result })
    }

    // Check for low stock alerts after sales
    await checkLowStockAlerts(userId)

    return NextResponse.json({
      success: true,
      results,
      message: `${results.filter(r => r.success).length} sales processed`
    })
  } catch (error) {
    console.error('Stock Sales Error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

async function checkLowStockAlerts(userId: string) {
  const items = await prisma.stockItem.findMany({
    where: { userId }
  })

  for (const item of items) {
    const isLow = item.quantity <= (item.minQuantity || 5)
    const isOut = item.quantity <= 0

    if (isLow || isOut) {
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
          : `⚠️ ${item.name} is running low (${item.quantity} ${item.unit || 'units'} remaining).`
        
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