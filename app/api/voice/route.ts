import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extractFromText, extractFromAudio } from '@/lib/gemini'
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

// ─── Helper: Update stock from transaction ──────────────────────────

async function updateStockFromTransaction(
  tx: any,
  userId: string,
  productName: string,
  quantity: number,
  type: 'credit' | 'debit',
  amount?: number
) {
  // Only subtract from stock for credit transactions (sales)
  if (type !== 'credit') return null

  // Find the stock item (case-insensitive)
  const allItems = await tx.stockItem.findMany({
    where: { userId },
    select: { id: true, name: true, quantity: true, unit: true, sellingPrice: true }
  })

  const stockItem = allItems.find(
    (i: any) => i.name.toLowerCase() === productName.toLowerCase()
  )

  if (stockItem) {
    // ✅ Item exists - subtract from stock
    const updated = await tx.stockItem.update({
      where: { id: stockItem.id },
      data: { quantity: { decrement: quantity } }
    })

    // Create a stock sale record
    await tx.stockSale.create({
      data: {
        userId,
        stockItemId: stockItem.id,
        quantity: quantity,
        sellingPrice: amount ? amount / quantity : stockItem.sellingPrice || 0,
        totalAmount: amount || quantity * (stockItem.sellingPrice || 0),
        note: `Auto-deducted from Voice transaction`
      }
    })

    // Check for low stock alerts
    await checkStockLevel(tx, userId, stockItem.id)

    return { 
      action: 'deducted', 
      item: updated,
      previousQuantity: stockItem.quantity,
      newQuantity: updated.quantity
    }
  } else {
    // ✅ Item doesn't exist - create it with 0 quantity
    const created = await tx.stockItem.create({
      data: {
        userId,
        name: productName,
        quantity: 0,
        unit: 'units',
        sellingPrice: amount ? amount / quantity : 0,
        purchasePrice: 0,
        minQuantity: 5,
        category: 'From Sales',
        description: `Auto-created from voice sale`
      }
    })
    return { 
      action: 'created', 
      item: created,
      previousQuantity: 0,
      newQuantity: 0
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = getUserId(req)
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const contentType = req.headers.get('content-type') || ''

    // 🔥 CASE 1: JSON with text (from demo button or typed input)
    if (contentType.includes('application/json')) {
      const body = await req.json()
      const { text } = body

      if (!text) {
        return NextResponse.json({ error: 'No text provided' }, { status: 400 })
      }

      // Extract transaction from text
      const extracted = await extractFromText(text)

      if ('error' in extracted) {
        return NextResponse.json({ error: extracted.error }, { status: 400 })
      }

      // Use transaction for consistency
      const result = await prisma.$transaction(async (tx) => {
        // Get or create customer
        let customer = await tx.customer.findFirst({
          where: {
            name: extracted.customerName,
            userId: userId
          }
        })

        if (!customer) {
          customer = await tx.customer.create({
            data: {
              name: extracted.customerName,
              userId: userId,
              totalDebt: 0,
              totalPaid: 0
            }
          })
        }

        // Create transaction
        const transaction = await tx.transaction.create({
          data: {
            customerId: customer.id,
            userId: userId,
            product: extracted.product,
            quantity: extracted.quantity || 1,
            amount: extracted.amount,
            type: extracted.type,
            status: extracted.type === 'credit' ? 'unpaid' : 'paid',
            description: extracted.description || `From voice: "${text}"`,
            source: 'voice' // ✅ Add source
          },
          include: {
            customer: true
          }
        })

        // ✅ UPDATE STOCK for credit transactions (sales)
        let stockUpdate = null
        if (extracted.type === 'credit') {
          stockUpdate = await updateStockFromTransaction(
            tx,
            userId,
            extracted.product,
            extracted.quantity || 1,
            extracted.type,
            extracted.amount
          )
        }

        // Update customer totals
        if (extracted.type === 'credit') {
          await tx.customer.update({
            where: { id: customer.id },
            data: { totalDebt: { increment: extracted.amount } }
          })
        } else {
          await tx.customer.update({
            where: { id: customer.id },
            data: { totalPaid: { increment: extracted.amount } }
          })
        }

        return { transaction, stockUpdate }
      })

      return NextResponse.json({
        success: true,
        transaction: result.transaction,
        stockUpdate: result.stockUpdate,
        message: result.stockUpdate 
          ? `Transaction added. Stock updated: ${result.stockUpdate.action === 'deducted' ? 'deducted' : 'created'} ${result.stockUpdate.item.name}`
          : 'Transaction added successfully'
      })
    }

    // 🔥 CASE 2: FormData with audio file (from voice recording upload)
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const audio = formData.get('audio') as File | null

      if (!audio) {
        return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
      }

      // Convert audio to base64
      const bytes = await audio.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const base64 = buffer.toString('base64')
      const mimeType = audio.type || 'audio/webm'

      // Extract transaction from audio
      const extracted = await extractFromAudio(base64, mimeType)

      if ('error' in extracted) {
        return NextResponse.json({ error: extracted.error }, { status: 400 })
      }

      // Use transaction for consistency
      const result = await prisma.$transaction(async (tx) => {
        // Get or create customer
        let customer = await tx.customer.findFirst({
          where: {
            name: extracted.customerName,
            userId: userId
          }
        })

        if (!customer) {
          customer = await tx.customer.create({
            data: {
              name: extracted.customerName,
              userId: userId,
              totalDebt: 0,
              totalPaid: 0
            }
          })
        }

        // Create transaction
        const transaction = await tx.transaction.create({
          data: {
            customerId: customer.id,
            userId: userId,
            product: extracted.product,
            quantity: extracted.quantity || 1,
            amount: extracted.amount,
            type: extracted.type,
            status: extracted.type === 'credit' ? 'unpaid' : 'paid',
            description: extracted.description || 'From audio input',
            source: 'voice', // ✅ Add source
            ...(extracted.transcript && { description: `Voice: ${extracted.transcript}` })
          },
          include: {
            customer: true
          }
        })

        // ✅ UPDATE STOCK for credit transactions (sales)
        let stockUpdate = null
        if (extracted.type === 'credit') {
          stockUpdate = await updateStockFromTransaction(
            tx,
            userId,
            extracted.product,
            extracted.quantity || 1,
            extracted.type,
            extracted.amount
          )
        }

        // Update customer totals
        if (extracted.type === 'credit') {
          await tx.customer.update({
            where: { id: customer.id },
            data: { totalDebt: { increment: extracted.amount } }
          })
        } else {
          await tx.customer.update({
            where: { id: customer.id },
            data: { totalPaid: { increment: extracted.amount } }
          })
        }

        return { transaction, stockUpdate, transcript: extracted.transcript }
      })

      return NextResponse.json({
        success: true,
        transaction: result.transaction,
        transcript: result.transcript,
        stockUpdate: result.stockUpdate,
        message: result.stockUpdate 
          ? `Transaction added. Stock updated: ${result.stockUpdate.action === 'deducted' ? 'deducted' : 'created'} ${result.stockUpdate.item.name}`
          : 'Transaction added successfully from audio'
      })
    }

    return NextResponse.json(
      { error: 'Unsupported content type' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Voice Error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}