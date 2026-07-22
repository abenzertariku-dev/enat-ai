'use client'

import { Search, MessageSquare, Users } from 'lucide-react'
import { useMemo, useState } from 'react'

interface Customer {
  id: string
  name: string
  phone?: string | null
  email?: string | null
  totalDebt: number
  totalPaid: number
  transactionCount: number
}

interface Transaction {
  id: string
  customer: { name: string }
  amount: number
  status: 'paid' | 'unpaid' | 'partial'
}

interface CustomersContentProps {
  /** Authoritative customer list from /api/customers — preferred over deriving from transactions */
  customers?: Customer[]
  /** Fallback source if `customers` wasn't passed (e.g. before the route is wired up) */
  transactions?: Transaction[]
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

function reminderMessage(name: string, amount: number) {
  return `Selam ${name}, this is a friendly reminder that you have an outstanding balance of ${amount.toLocaleString()} Br. Please let us know if you have any questions. Thank you!`
}

export default function CustomersContent({ customers, transactions }: CustomersContentProps) {
  const [search, setSearch] = useState('')

  const list: Customer[] = useMemo(() => {
    if (customers) return customers

    // Fallback: derive from the visible transactions only. Less accurate once a
    // merchant has more than the transaction list's page size — prefer passing `customers`.
    const map = new Map<string, Customer>()
    ;(transactions ?? []).forEach((t) => {
      const name = t.customer.name
      if (!map.has(name)) {
        map.set(name, { id: name, name, totalDebt: 0, totalPaid: 0, transactionCount: 0 })
      }
      const c = map.get(name)!
      if (t.status === 'unpaid') c.totalDebt += t.amount
      else c.totalPaid += t.amount
      c.transactionCount += 1
    })
    return Array.from(map.values()).sort((a, b) => b.totalDebt - a.totalDebt)
  }, [customers, transactions])

  const filtered = list.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <h2 className="text-lg font-bold tracking-tight text-[#1F2A24]">Customers</h2>
        <p className="mt-1 text-sm text-[#1F2A24]/50">Manage your customer relationships and balances</p>
      </div>

      <div className="relative">
        <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#1F2A24]/30" />
        <input
          type="text"
          placeholder="Search customers…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-black/10 bg-white py-2.5 pl-10 pr-4 text-[13.5px] placeholder:text-[#1F2A24]/30 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#0F6B4C]/40"
        />
      </div>

      <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        {filtered.length === 0 ? (
          <div className="py-10 text-center text-[#1F2A24]/35">
            <Users size={30} className="mx-auto mb-2" />
            <p className="text-[13.5px] font-medium text-[#1F2A24]/60">No customers yet</p>
            <p className="text-[12px]">Add transactions to build your customer list.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((customer) => (
              <div
                key={customer.id}
                className="flex items-center gap-3 rounded-xl bg-[#FBF9F5] p-3 transition hover:bg-[#F3EFE6]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0F6B4C] text-[12px] font-semibold text-white">
                  {initials(customer.name)}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold text-[#1F2A24]">{customer.name}</p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] text-[#1F2A24]/45">
                    <span>{customer.transactionCount} transactions</span>
                    {customer.phone && <span>· {customer.phone}</span>}
                    {customer.email && <span className="truncate">· {customer.email}</span>}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {customer.totalDebt > 0 ? (
                    <div className="text-right">
                      <p className="text-[13px] font-bold text-[#C1442E]">{customer.totalDebt.toLocaleString()} Br</p>
                      <p className="text-[10.5px] text-[#1F2A24]/40">due</p>
                    </div>
                  ) : (
                    <div className="text-right">
                      <p className="text-[13px] font-semibold text-[#0F6B4C]">Settled</p>
                    </div>
                  )}

                  {customer.totalDebt > 0 && customer.phone && (
                    <a
                      href={`sms:${customer.phone}?body=${encodeURIComponent(
                        reminderMessage(customer.name, customer.totalDebt)
                      )}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E5A823]/15 text-[#B8860B] transition hover:bg-[#E5A823]/25"
                      title="Send SMS reminder"
                    >
                      <MessageSquare size={15} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}