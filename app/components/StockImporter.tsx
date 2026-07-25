'use client'

import { useState } from 'react'
import { Upload, X, Check, AlertCircle, Package, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { useI18n } from '@/lib/i18n'

interface StockImporterProps {
  onImportComplete: () => void
}

export default function StockImporter({ onImportComplete }: StockImporterProps) {
  const { t } = useI18n()
  const [itemsText, setItemsText] = useState('')
  const [pricesText, setPricesText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<{ success: boolean; message: string }[]>([])

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token')
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }

  const handleImport = async () => {
    if (!itemsText.trim()) {
      toast.error(t('stock.enterOneItem'))
      return
    }

    setIsLoading(true)
    setResults([])

    try {
      const lines = itemsText.split('\n').filter(line => line.trim())
      const priceLines = pricesText.split('\n').filter(line => line.trim())

      const items = lines.map((line, index) => {
        const parts = line.split(',').map(s => s.trim())
        const priceParts = priceLines[index]?.split(',').map(s => s.trim()) || []

        return {
          name: parts[0] || '',
          quantity: parseFloat(parts[1]) || 0,
          unit: parts[2] || 'units',
          sellingPrice: parseFloat(priceParts[0]) || 0,
          purchasePrice: parseFloat(priceParts[1]) || 0,
          minQuantity: parseFloat(parts[3]) || 5,
          category: parts[4] || 'Uncategorized',
          description: parts[5] || '',
        }
      }).filter(item => item.name)

      if (items.length === 0) {
        toast.error(t('stock.noValidItems'))
        return
      }

      const res = await fetch('/api/stock', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ items })
      })

      const data = await res.json()

      if (res.ok) {
        setResults(data.results.map((r: any) => ({
          success: true,
          message: `${r.action === 'created' ? `➕ ${t('stock.added')}` : `🔄 ${t('stock.updatedRow')}`}: ${r.item.name} (${r.item.quantity} ${r.item.unit})`
        })))
        toast.success(`✅ ${t('stock.itemsProcessed', { n: data.results.length })}`)
        onImportComplete()
        setItemsText('')
        setPricesText('')
      } else {
        toast.error(data.error || t('stock.importFailed'))
      }
    } catch (error) {
      toast.error(t('common.networkError'))
    } finally {
      setIsLoading(false)
    }
  }

  const sampleItems = `Teff,100,kg,10,Grains
Coffee,50,kg,30,Beverages
Sugar,200,kg,5,Groceries
Salt,80,kg,3,Groceries
Oil,40,liters,15,Groceries`

  const samplePrices = `85,70
120,90
45,38
12,8
180,150`

  const fillDefaults = () => {
    setItemsText(sampleItems)
    setPricesText(samplePrices)
  }

  return (
    <div className="bg-white rounded-2xl border border-black/5 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-[#1F2A24]">{t('stock.bulkAdd')}</h3>
          <p className="text-sm text-[#1F2A24]/50">{t('stock.bulkAddHint')}</p>
        </div>
        <button
          onClick={fillDefaults}
          className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
        >
          {t('stock.fillExample')}
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#1F2A24]/70 mb-1">
            {t('stock.itemsLabel')}
            <span className="text-xs text-[#1F2A24]/40 block mt-0.5">
              {t('stock.itemsFormat')}
            </span>
          </label>
          <textarea
            value={itemsText}
            onChange={(e) => setItemsText(e.target.value)}
            placeholder="Teff,100,kg,10,Grains"
            className="w-full h-48 rounded-xl border border-black/10 px-4 py-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500/40 font-mono"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1F2A24]/70 mb-1">
            {t('stock.pricesLabel')}
            <span className="text-xs text-[#1F2A24]/40 block mt-0.5">
              {t('stock.pricesFormat')}
            </span>
          </label>
          <textarea
            value={pricesText}
            onChange={(e) => setPricesText(e.target.value)}
            placeholder="85,70"
            className="w-full h-48 rounded-xl border border-black/10 px-4 py-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500/40 font-mono"
          />
        </div>
      </div>

      <div className="flex gap-3 mt-4">
        <button
          onClick={handleImport}
          disabled={isLoading || !itemsText.trim()}
          className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition disabled:opacity-50"
        >
          <Upload size={18} />
          {isLoading ? t('stock.importing') : t('stock.importItems')}
        </button>
        <button
          onClick={() => {
            setItemsText('')
            setPricesText('')
            setResults([])
          }}
          className="px-6 py-2.5 border border-black/10 rounded-xl font-medium hover:bg-gray-50 transition"
        >
          {t('stock.clear')}
        </button>
      </div>

      {results.length > 0 && (
        <div className="mt-4 max-h-48 overflow-y-auto space-y-1">
          {results.map((r, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 text-sm p-2 rounded-lg ${
                r.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
              }`}
            >
              {r.success ? <Check size={14} /> : <AlertCircle size={14} />}
              {r.message}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
