import { Prisma, PrismaClient } from '@prisma/client'

type TxClient = Prisma.TransactionClient | PrismaClient

/**
 * Checks a single stock item's level and keeps its alerts in sync:
 * - Creates a new unread alert if the item just dropped to/below its minimum
 *   (or hit zero), but only if there isn't already an unread alert of that
 *   same type — avoids spamming duplicate alerts on every sale.
 * - Auto-resolves (marks read) any open low/out-of-stock alerts once the
 *   item is restocked above its minimum again.
 *
 * Call this inside the same transaction as whatever changed the quantity
 * (a sale, a manual adjustment, a bulk import) so the alert state never
 * drifts out of sync with the actual stock level.
 */
export async function checkStockLevel(tx: TxClient, userId: string, stockItemId: string) {
  const item = await tx.stockItem.findUnique({ where: { id: stockItemId } })
  if (!item || item.userId !== userId) return

  const minQuantity = item.minQuantity ?? 5
  const alertType: 'out_of_stock' | 'low_stock' | null =
    item.quantity <= 0 ? 'out_of_stock' : item.quantity <= minQuantity ? 'low_stock' : null

  if (alertType) {
    const existing = await tx.stockAlert.findFirst({
      where: { stockItemId, type: alertType, isRead: false },
    })
    if (!existing) {
      const message =
        alertType === 'out_of_stock'
          ? `${item.name} is out of stock.`
          : `${item.name} is running low — ${item.quantity} ${item.unit ?? 'units'} left (minimum ${minQuantity}).`

      await tx.stockAlert.create({
        data: { userId, stockItemId, type: alertType, message },
      })
    }
  } else {
    // Back above the minimum — auto-resolve any open alerts for this item
    await tx.stockAlert.updateMany({
      where: { stockItemId, isRead: false, type: { in: ['low_stock', 'out_of_stock'] } },
      data: { isRead: true },
    })
  }
}