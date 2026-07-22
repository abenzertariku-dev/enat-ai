import { prisma } from '@/lib/prisma'
import type { ExtractedTransaction } from '@/lib/gemini'

/**
 * Finds or creates the customer and records a transaction, keeping
 * Customer.totalDebt / totalPaid in sync in a single atomic operation.
 * Used by both the scan (image) and voice routes so the logic only
 * has to be correct in one place.
 */
export async function recordTransaction(
  userId: string,
  extracted: ExtractedTransaction,
  source: string
) {
  const name = extracted.customerName.trim()

  return prisma.$transaction(async (tx) => {
    // SQLite doesn't support Prisma's `mode: 'insensitive'` filter (Postgres/MySQL only),
    // so do the case-insensitive match ourselves. Per-user customer lists are small,
    // so this is cheap.
    const existingCustomers = await tx.customer.findMany({ where: { userId } })
    let customer = existingCustomers.find(
      (c) => c.name.trim().toLowerCase() === name.toLowerCase()
    )

    if (!customer) {
      customer = await tx.customer.create({
        data: { name, userId, totalDebt: 0, totalPaid: 0 },
      })
    }

    const status = extracted.type === 'credit' ? 'unpaid' : 'paid'

    const transaction = await tx.transaction.create({
      data: {
        customerId: customer.id,
        userId,
        product: extracted.product,
        quantity: extracted.quantity,
        amount: extracted.amount,
        type: extracted.type,
        status,
        description: extracted.description || `From ${source}`,
      },
      include: { customer: true },
    })

    await tx.customer.update({
      where: { id: customer.id },
      data:
        extracted.type === 'credit'
          ? { totalDebt: { increment: extracted.amount } }
          : { totalPaid: { increment: extracted.amount } },
    })

    return transaction
  })
}