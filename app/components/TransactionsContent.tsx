'use client'
import { Search, ChevronDown, Inbox, SearchX } from 'lucide-react'
import { useState, useEffect } from 'react'

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

const STATUS_STYLE: Record<string, { badge: string; amount: string; label: string }> = {
  unpaid: { badge: 'bg-[#C1442E]/10 text-[#C1442E]', amount: 'text-[#C1442E]', label: 'Unpaid' },
  paid: { badge: 'bg-[#0F6B4C]/10 text-[#0F6B4C]', amount: 'text-[#0F6B4C]', label: 'Paid' },
  partial: { badge: 'bg-[#E5A823]/15 text-[#B8860B]', amount: 'text-[#B8860B]', label: 'Partial' },
}

// ✅ Source badge configuration
const SOURCE_STYLES: Record<string, { label: string; className: string }> = {
  voice: { label: '🎙️ Voice', className: 'bg-purple-100 text-purple-700' },
  scan: { label: '📸 Scan', className: 'bg-orange-100 text-orange-700' },
  stock_in: { label: '📦 Stock In', className: 'bg-emerald-100 text-emerald-700' },
  stock_out: { label: '🛒 Sale', className: 'bg-blue-100 text-blue-700' },
}

export default function TransactionsContent({ transactions, onMarkAsPaid }: TransactionsContentProps) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7412/ingest/e41294ac-d718-4cb0-a12d-1333a9614c42',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'31395e'},body:JSON.stringify({sessionId:'31395e',runId:'i18n-pre',hypothesisId:'A',location:'TransactionsContent.tsx:mount',message:'TransactionsContent render — hardcoded EN?',data:{usesI18n:false,docLang:typeof document!=='undefined'?document.documentElement.lang:'?',hardcodedTitle:'All transactions'},timestamp:Date.now()})}).catch(()=>{});
  }, [])
  // #endregion

  // ✅ FIX: Safe filtering - handle null customer
  const filtered = transactions.filter((t) => {
    const q = search.toLowerCase()
    // ✅ Safe access: use optional chaining and fallback
    const customerName = t.customer?.name?.toLowerCase() || ''
    const productName = t.product?.toLowerCase() || ''
    const matchSearch = customerName.includes(q) || productName.includes(q)
    const matchFilter = filter === 'all' || t.status === filter
    return matchSearch && matchFilter
  })

  const hasAnyTransactions = transactions.length > 0

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <h2 className="text-lg font-bold tracking-tight text-[#1F2A24]">All transactions</h2>
        <p className="mt-1 text-sm text-[#1F2A24]/50">View and manage everything in your ledger</p>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-2.5">
        <div className="relative flex-1">
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#1F2A24]/30" />
          <input
            type="text"
            placeholder="Search by customer or product…"
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
            <option value="all">All</option>
            <option value="unpaid">Unpaid</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
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
                <p className="text-[13.5px] font-medium text-[#1F2A24]/60">No matches</p>
                <p className="text-[12px]">Try a different search or filter.</p>
              </>
            ) : (
              <>
                <Inbox size={30} className="mx-auto mb-2" />
                <p className="text-[13.5px] font-medium text-[#1F2A24]/60">No transactions yet</p>
                <p className="text-[12px]">Add one using Scan or Voice.</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((t) => {
              const style = STATUS_STYLE[t.status] ?? STATUS_STYLE.unpaid
              const sourceStyle = t.source ? SOURCE_STYLES[t.source] : null
              const isStockTransaction = t.source === 'stock_in' || t.source === 'stock_out'

              return (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-xl bg-[#FBF9F5] p-3 transition hover:bg-[#F3EFE6]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[13.5px] font-semibold text-[#1F2A24]">
                        {/* ✅ Show "Stock System" for stock transactions, otherwise customer name */}
                        {isStockTransaction ? '📦 Stock System' : (t.customer?.name || 'Unknown Customer')}
                      </p>
                      {/* Source badge */}
                      {sourceStyle && (
                        <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${sourceStyle.className}`}>
                          {sourceStyle.label}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[12px] text-[#1F2A24]/45">
                      <span className="truncate">{t.product}</span>
                      <span className="h-0.5 w-0.5 rounded-full bg-[#1F2A24]/25" />
                      <span>{new Date(t.date).toLocaleDateString()}</span>
                      {/* Show description if available */}
                      {t.description && (
                        <>
                          <span className="h-0.5 w-0.5 rounded-full bg-[#1F2A24]/25" />
                          <span className="truncate text-[#1F2A24]/30">{t.description}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="ml-2 flex-shrink-0 text-right">
                    <p className={`font-bold ${style.amount}`}>{t.amount.toLocaleString()} Br</p>
                    <div className="mt-0.5 flex items-center justify-end gap-1.5">
                      <span className={`rounded px-1.5 py-0.5 text-[10.5px] font-semibold ${style.badge}`}>
                        {style.label}
                      </span>
                      {/* Only show "Mark paid" for non-stock transactions */}
                      {t.status !== 'paid' && !isStockTransaction && (
                        <button
                          onClick={() => onMarkAsPaid(t.id)}
                          className="rounded bg-[#1F2A24]/8 px-2 py-0.5 text-[10.5px] font-semibold text-[#1F2A24]/70 transition hover:bg-[#1F2A24]/15"
                        >
                          Mark paid
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