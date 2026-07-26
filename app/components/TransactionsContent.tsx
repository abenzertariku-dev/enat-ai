'use client'
import { Search, ChevronDown, Inbox, SearchX } from 'lucide-react'
import { useState } from 'react'
import { useI18n } from '@/lib/i18n'

interface Transaction {
  id: string
  customer: { name: string } | null  // ✅ Allow null
  product: string
  amount: number
  status: 'paid' | 'unpaid' | 'partial'
  date: string
  source?: 'voice' | 'scan' | 'stock_in' | 'stock_out'
  description?: string
}

interface TransactionsContentProps {
  transactions: Transaction[]
  onMarkAsPaid: (id: string) => void
}

const STATUS_STYLE: Record<string, { badge: string; amount: string }> = {
  unpaid: { badge: 'bg-[#C1442E]/10 text-[#C1442E]', amount: 'text-[#C1442E]' },
  paid: { badge: 'bg-[#0F6B4C]/10 text-[#0F6B4C]', amount: 'text-[#0F6B4C]' },
  partial: { badge: 'bg-[#E5A823]/15 text-[#B8860B]', amount: 'text-[#B8860B]' },
}

function statusLabel(status: string, t: (key: string) => string) {
  if (status === 'paid') return t('common.paid')
  if (status === 'partial') return t('common.partial')
  return t('common.unpaid')
}

// ✅ Source badge configuration
const SOURCE_STYLES: Record<string, { label: string; className: string }> = {
  voice: { label: '🎙️ Voice', className: 'bg-purple-100 text-purple-700' },
  scan: { label: '📸 Scan', className: 'bg-orange-100 text-orange-700' },
  stock_in: { label: '📦 Stock In', className: 'bg-emerald-100 text-emerald-700' },
  stock_out: { label: '🛒 Sale', className: 'bg-blue-100 text-blue-700' },
}

export default function TransactionsContent({ transactions, onMarkAsPaid }: TransactionsContentProps) {
  const { t } = useI18n()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  // ✅ FIX: Safe filtering - handle null customer
  const filtered = transactions.filter((tx) => {
    const q = search.toLowerCase()
    // ✅ Safe access: use optional chaining and fallback
    const customerName = tx.customer?.name?.toLowerCase() || ''
    const productName = tx.product?.toLowerCase() || ''
    const matchSearch = customerName.includes(q) || productName.includes(q)
    const matchFilter = filter === 'all' || tx.status === filter
    return matchSearch && matchFilter
  })

  const hasAnyTransactions = transactions.length > 0

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <h2 className="text-lg font-bold tracking-tight text-[#1F2A24]">{t('tx.title')}</h2>
        <p className="mt-1 text-sm text-[#1F2A24]/50">{t('tx.subtitle')}</p>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-2.5">
        <div className="relative flex-1">
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#1F2A24]/30" />
          <input
            type="text"
            placeholder={t('tx.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-black/10 bg-white py-2.5 pl-10 pr-4 text-[13.5px] placeholder:text-[#1F2A24]/30 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#0F6B4C]/40"
          />
        </div>
        <div className="relative">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-full appearance-none rounded-xl border border-black/10 bg-white py-2.5 pl-4 pr-9 text-[13.5px] font-medium text-[#1F2A24] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#0F6B4C]/40"
          >
            <option value="all">{t('common.all')}</option>
            <option value="unpaid">{t('common.unpaid')}</option>
            <option value="partial">{t('common.partial')}</option>
            <option value="paid">{t('common.paid')}</option>
          </select>
          <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#1F2A24]/35" />
        </div>
      </div>

      {/* Transaction List */}
      <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        {filtered.length === 0 ? (
          <div className="py-10 text-center text-[#1F2A24]/35">
            {hasAnyTransactions ? (
              <>
                <SearchX size={30} className="mx-auto mb-2" />
                <p className="text-[13.5px] font-medium text-[#1F2A24]/60">{t('tx.noMatches')}</p>
                <p className="text-[12px]">{t('tx.noMatchesHint')}</p>
              </>
            ) : (
              <>
                <Inbox size={30} className="mx-auto mb-2" />
                <p className="text-[13.5px] font-medium text-[#1F2A24]/60">{t('dash.noTx')}</p>
                <p className="text-[12px]">{t('dash.noTxHint')}</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((tx) => {
              const style = STATUS_STYLE[tx.status] ?? STATUS_STYLE.unpaid
              const sourceStyle = tx.source ? SOURCE_STYLES[tx.source] : null
              const isStockTransaction = tx.source === 'stock_in' || tx.source === 'stock_out'

              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-xl bg-[#FBF9F5] p-3 transition hover:bg-[#F3EFE6]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[13.5px] font-semibold text-[#1F2A24]">
                        {/* ✅ Show "Stock System" for stock transactions, otherwise customer name */}
                        {isStockTransaction ? `📦 ${t('dash.stockSystem')}` : (tx.customer?.name || t('common.unknown'))}
                      </p>
                      {/* Source badge */}
                      {sourceStyle && (
                        <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${sourceStyle.className}`}>
                          {sourceStyle.label}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[12px] text-[#1F2A24]/45">
                      <span className="truncate">{tx.product}</span>
                      <span className="h-0.5 w-0.5 rounded-full bg-[#1F2A24]/25" />
                      <span>{new Date(tx.date).toLocaleDateString()}</span>
                      {/* Show description if available */}
                      {tx.description && (
                        <>
                          <span className="h-0.5 w-0.5 rounded-full bg-[#1F2A24]/25" />
                          <span className="truncate text-[#1F2A24]/30">{tx.description}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="ml-2 flex-shrink-0 text-right">
                    <p className={`font-bold ${style.amount}`}>{tx.amount.toLocaleString()} Br</p>
                    <div className="mt-0.5 flex items-center justify-end gap-1.5">
                      <span className={`rounded px-1.5 py-0.5 text-[10.5px] font-semibold ${style.badge}`}>
                        {statusLabel(tx.status, t)}
                      </span>
                      {/* Only show "Mark paid" for non-stock transactions */}
                      {tx.status !== 'paid' && !isStockTransaction && (
                        <button
                          onClick={() => onMarkAsPaid(tx.id)}
                          className="rounded bg-[#1F2A24]/8 px-2 py-0.5 text-[10.5px] font-semibold text-[#1F2A24]/70 transition hover:bg-[#1F2A24]/15"
                        >
                          {t('tx.markPaid')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
