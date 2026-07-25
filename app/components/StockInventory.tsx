'use client'

import { useState } from 'react'
import { 
  Package, Search, Edit2, Trash2, AlertTriangle, 
  TrendingUp, TrendingDown, Minus, Plus
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useI18n } from '@/lib/i18n'

interface StockItem {
  id: string
  name: string
  quantity: number
  unit: string
  sellingPrice: number
  purchasePrice: number
  minQuantity: number
  category: string
  description?: string
}

interface StockInventoryProps {
  items: StockItem[]
  onRefresh: () => void
  onUpdateItem: () => void
}

export default function StockInventory({ items, onRefresh, onUpdateItem }: StockInventoryProps) {
  const { t } = useI18n()
  const [search, setSearch] = useState('')
  const [editingItem, setEditingItem] = useState<StockItem | null>(null)

  const filtered = items.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.category?.toLowerCase().includes(search.toLowerCase())
  )

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token')
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }

  const handleUpdateQuantity = async (id: string, change: number) => {
    try {
      const res = await fetch('/api/stock', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          id,
          quantity: { increment: change },
        }),
      })
      if (res.ok) {
        toast.success(t('stock.updated'))
        onRefresh()
      } else {
        toast.error(t('stock.updateFailed'))
      }
    } catch (error) {
      toast.error(t('stock.updateFailed'))
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('stock.confirmDelete'))) return
    try {
      const res = await fetch(`/api/stock?id=${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })
      if (res.ok) {
        toast.success(t('stock.deleted'))
        onRefresh()
      }
    } catch (error) {
      toast.error(t('stock.deleteFailed'))
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem) return

    try {
      const res = await fetch('/api/stock', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(editingItem)
      })
      if (res.ok) {
        toast.success(t('stock.itemUpdated'))
        setEditingItem(null)
        onUpdateItem()
        onRefresh()
      }
    } catch (error) {
      toast.error(t('toast.updateFailed'))
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-black/5 p-4 shadow-sm">
      {/* Search */}
      <div className="relative mb-4">
        <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#1F2A24]/30" />
        <input
          type="text"
          placeholder={t('stock.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-black/10 bg-[#FBF9F5] py-2.5 pl-10 pr-4 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="py-10 text-center text-[#1F2A24]/35">
          <Package size={30} className="mx-auto mb-2" />
          <p className="font-medium">{t('stock.empty')}</p>
          <p className="text-sm">{t('stock.emptyHint')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => {
            const isLow = item.quantity <= (item.minQuantity || 5)
            const isOut = item.quantity <= 0

            return (
              <div
                key={item.id}
                className={`flex items-center gap-4 p-3 rounded-xl transition ${
                  isOut ? 'bg-red-50 border border-red-200' :
                  isLow ? 'bg-yellow-50 border border-yellow-200' :
                  'bg-[#FBF9F5] hover:bg-[#F3EFE6]'
                }`}
              >
                {/* Icon */}
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  isOut ? 'bg-red-100 text-red-600' :
                  isLow ? 'bg-yellow-100 text-yellow-600' :
                  'bg-emerald-100 text-emerald-600'
                }`}>
                  <Package size={18} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-[#1F2A24] truncate">{item.name}</p>
                    {isOut && (
                      <span className="text-[10px] font-semibold text-red-600 bg-red-100 px-1.5 py-0.5 rounded">
                        {t('stock.out')}
                      </span>
                    )}
                    {isLow && !isOut && (
                      <span className="text-[10px] font-semibold text-yellow-600 bg-yellow-100 px-1.5 py-0.5 rounded">
                        {t('stock.low')}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#1F2A24]/50">
                    <span>{item.quantity} {item.unit || t('common.units')}</span>
                    <span className="w-0.5 h-0.5 rounded-full bg-[#1F2A24]/20" />
                    <span>{t('stock.minLabel', { n: item.minQuantity || 5 })}</span>
                    {item.sellingPrice > 0 && (
                      <>
                        <span className="w-0.5 h-0.5 rounded-full bg-[#1F2A24]/20" />
                        <span>{t('stock.saleLabel', { n: item.sellingPrice })}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleUpdateQuantity(item.id, 1)}
                    className="p-1.5 rounded-lg hover:bg-emerald-100 text-emerald-600 transition"
                    title={t('stock.addOne')}
                  >
                    <Plus size={14} />
                  </button>
                  <button
                    onClick={() => handleUpdateQuantity(item.id, -1)}
                    disabled={item.quantity <= 0}
                    className="p-1.5 rounded-lg hover:bg-red-100 text-red-600 transition disabled:opacity-30"
                    title={t('stock.removeOne')}
                  >
                    <Minus size={14} />
                  </button>
                  <button
                    onClick={() => setEditingItem(item)}
                    className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-600 transition"
                    title={t('common.edit')}
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 rounded-lg hover:bg-red-100 text-red-600 transition"
                    title={t('common.delete')}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-[#1F2A24] mb-4">{t('stock.editItem')}</h3>
            <form onSubmit={handleEdit} className="space-y-3">
              <input
                type="text"
                value={editingItem.name}
                onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                className="w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm"
                placeholder={t('stock.itemName')}
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  value={editingItem.quantity}
                  onChange={(e) => setEditingItem({ ...editingItem, quantity: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm"
                  placeholder={t('stock.quantity')}
                  step="0.5"
                />
                <input
                  type="text"
                  value={editingItem.unit || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })}
                  className="w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm"
                  placeholder={t('stock.unitPlaceholder')}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  value={editingItem.sellingPrice || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, sellingPrice: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm"
                  placeholder={t('stock.sellingPrice')}
                  step="0.01"
                />
                <input
                  type="number"
                  value={editingItem.minQuantity || 5}
                  onChange={(e) => setEditingItem({ ...editingItem, minQuantity: parseFloat(e.target.value) || 5 })}
                  className="w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm"
                  placeholder={t('stock.minQuantityAlert')}
                  step="0.5"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-black/10 text-sm font-medium hover:bg-gray-50 transition"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition"
                >
                  {t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
