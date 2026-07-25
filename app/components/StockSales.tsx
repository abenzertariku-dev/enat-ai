'use client'

import { useState } from 'react'
import { ShoppingCart, Search, Minus, Plus, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'

interface StockItem {
  id: string
  name: string
  quantity: number
  unit: string
  sellingPrice: number
}

interface StockSalesProps {
  items: StockItem[]
  onSaleComplete: () => void
}

export default function StockSales({ items, onSaleComplete }: StockSalesProps) {
  const [search, setSearch] = useState('')
  const [selectedItems, setSelectedItems] = useState<{ id: string; quantity: number }[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase())
  )

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token')
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }

  const addItem = (id: string) => {
    const existing = selectedItems.find(s => s.id === id)
    if (existing) {
      setSelectedItems(selectedItems.map(s =>
        s.id === id ? { ...s, quantity: s.quantity + 1 } : s
      ))
    } else {
      setSelectedItems([...selectedItems, { id, quantity: 1 }])
    }
  }

  const removeItem = (id: string) => {
    const existing = selectedItems.find(s => s.id === id)
    if (existing && existing.quantity > 1) {
      setSelectedItems(selectedItems.map(s =>
        s.id === id ? { ...s, quantity: s.quantity - 1 } : s
      ))
    } else {
      setSelectedItems(selectedItems.filter(s => s.id !== id))
    }
  }

  const handleSubmitSales = async () => {
    if (selectedItems.length === 0) {
      toast.error('Please select at least one item')
      return
    }

    setIsLoading(true)
    try {
      const sales = selectedItems.map(s => {
        const item = items.find(i => i.id === s.id)
        return {
          stockItemId: s.id,
          quantity: s.quantity,
          sellingPrice: item?.sellingPrice || 0,
          note: `Sold ${s.quantity} ${item?.unit || 'units'}`
        }
      })

      const res = await fetch('/api/stock-sales', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ sales })
      })

      const data = await res.json()

      if (res.ok) {
        toast.success(`✅ ${data.results.filter(r => r.success).length} sales recorded!`)
        setSelectedItems([])
        onSaleComplete()
      } else {
        toast.error(data.error || 'Failed to record sales')
      }
    } catch (error) {
      toast.error('Network error')
    } finally {
      setIsLoading(false)
    }
  }

  const getItemName = (id: string) => {
    return items.find(i => i.id === id)?.name || 'Unknown'
  }

  const getItemPrice = (id: string) => {
    return items.find(i => i.id === id)?.sellingPrice || 0
  }

  return (
    <div className="bg-white rounded-2xl border border-black/5 p-4 shadow-sm">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Available Items */}
        <div>
          <h3 className="font-semibold text-[#1F2A24] mb-3">Available Items</h3>
          <div className="relative mb-3">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#1F2A24]/30" />
            <input
              type="text"
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-[#FBF9F5] py-2.5 pl-10 pr-4 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
          </div>

          <div className="max-h-72 overflow-y-auto space-y-1">
            {filteredItems.map(item => (
              <button
                key={item.id}
                onClick={() => addItem(item.id)}
                disabled={item.quantity <= 0}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition text-left ${
                  item.quantity <= 0
                    ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                    : 'hover:bg-emerald-50 bg-[#FBF9F5]'
                }`}
              >
                <div>
                  <p className={`font-medium ${item.quantity <= 0 ? '' : 'text-[#1F2A24]'}`}>
                    {item.name}
                  </p>
                  <p className="text-xs text-[#1F2A24]/40">
                    {item.quantity} {item.unit} available
                  </p>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${item.quantity <= 0 ? 'text-gray-400' : 'text-emerald-600'}`}>
                    {item.sellingPrice} Br
                  </p>
                  {item.quantity <= 0 && (
                    <span className="text-xs text-red-500">Out of stock</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Items */}
        <div>
          <h3 className="font-semibold text-[#1F2A24] mb-3">
            Selected Items ({selectedItems.length})
          </h3>

          {selectedItems.length === 0 ? (
            <div className="text-center py-8 text-[#1F2A24]/35">
              <ShoppingCart size={30} className="mx-auto mb-2" />
              <p>No items selected</p>
              <p className="text-sm">Click on items to add to sale</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {selectedItems.map(s => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl"
                >
                  <div>
                    <p className="font-medium text-[#1F2A24]">{getItemName(s.id)}</p>
                    <p className="text-sm text-emerald-700">
                      {s.quantity} × {getItemPrice(s.id)} Br
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => removeItem(s.id)}
                      className="p-1 rounded-lg hover:bg-red-100 text-red-600 transition"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="font-bold w-6 text-center">{s.quantity}</span>
                    <button
                      onClick={() => addItem(s.id)}
                      className="p-1 rounded-lg hover:bg-emerald-100 text-emerald-600 transition"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedItems.length > 0 && (
            <div className="mt-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                <span className="font-medium text-[#1F2A24]">Total</span>
                <span className="font-bold text-emerald-600">
                  {selectedItems.reduce((sum, s) => {
                    const item = items.find(i => i.id === s.id)
                    return sum + (item?.sellingPrice || 0) * s.quantity
                  }, 0).toLocaleString()} Br
                </span>
              </div>
              <button
                onClick={handleSubmitSales}
                disabled={isLoading}
                className="w-full mt-3 px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Check size={18} />
                {isLoading ? 'Recording...' : `Record Sale (${selectedItems.length} items)`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}