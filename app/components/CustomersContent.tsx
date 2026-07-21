'use client'

import { Users, Search, Mail, Phone, DollarSign } from 'lucide-react'
import { useState } from 'react'

interface CustomersContentProps {
  transactions: any[]
}

export default function CustomersContent({ transactions }: CustomersContentProps) {
  const [search, setSearch] = useState('')

  // Aggregate customers from transactions
  const customerMap = new Map()
  transactions.forEach(t => {
    const name = t.customer.name
    if (!customerMap.has(name)) {
      customerMap.set(name, {
        name,
        totalDebt: 0,
        totalPaid: 0,
        transactions: 0
      })
    }
    const customer = customerMap.get(name)
    if (t.status === 'unpaid') {
      customer.totalDebt += t.amount
    } else {
      customer.totalPaid += t.amount
    }
    customer.transactions += 1
  })

  const customers = Array.from(customerMap.values())
  
  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h2 className="text-xl font-bold text-gray-800 mb-2">👥 Customers</h2>
        <p className="text-gray-500 text-sm">Manage your customer relationships</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search customers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>

      {/* Customer List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <div className="text-4xl mb-2">👤</div>
            <p className="font-medium">No customers yet</p>
            <p className="text-sm">Add transactions to build your customer list</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((customer, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">
                    {customer.name}
                  </p>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <DollarSign size={14} className="text-emerald-500" />
                      Total: {customer.totalDebt + customer.totalPaid} Br
                    </span>
                    <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                    <span>{customer.transactions} transactions</span>
                  </div>
                </div>
                {customer.totalDebt > 0 && (
                  <div className="text-right">
                    <span className="text-sm font-medium text-red-600">
                      {customer.totalDebt.toLocaleString()} Br
                    </span>
                    <p className="text-xs text-gray-400">due</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}