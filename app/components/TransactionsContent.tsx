'use client'

import { Search, Filter, ChevronDown } from 'lucide-react'
import { useState } from 'react'

interface TransactionsContentProps {
  transactions: any[]
  onMarkAsPaid: (id: string) => void
}

export default function TransactionsContent({ transactions, onMarkAsPaid }: TransactionsContentProps) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const filtered = transactions.filter(t => {
    const matchSearch = t.customer.name.toLowerCase().includes(search.toLowerCase()) ||
                        t.product.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || t.status === filter
    return matchSearch && matchFilter
  })

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h2 className="text-xl font-bold text-gray-800 mb-2">📋 All Transactions</h2>
        <p className="text-gray-500 text-sm">View and manage all your transactions</p>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by customer or product..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent appearance-none"
        >
          <option value="all">All</option>
          <option value="unpaid">Unpaid</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      {/* Transaction List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <div className="text-4xl mb-2">📭</div>
            <p className="font-medium">No transactions found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition group">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">
                    {t.customer.name}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span className="truncate">{t.product}</span>
                    <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                    <span>{new Date(t.date).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="text-right ml-2 flex-shrink-0">
                  <p className={`font-bold ${t.status === 'unpaid' ? 'text-red-600' : 'text-emerald-600'}`}>
                    {t.amount.toLocaleString()} Br
                  </p>
                  <div className="flex items-center gap-1 justify-end">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      t.status === 'unpaid' 
                        ? 'bg-red-100 text-red-600' 
                        : 'bg-emerald-100 text-emerald-600'
                    }`}>
                      {t.status === 'unpaid' ? '🔴 Unpaid' : '✅ Paid'}
                    </span>
                    {t.status === 'unpaid' && (
                      <button
                        onClick={() => onMarkAsPaid(t.id)}
                        className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded hover:bg-blue-200 transition opacity-0 group-hover:opacity-100"
                      >
                        Pay
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}