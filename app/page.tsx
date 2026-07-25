'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Navigation from '@/app/components/Navigation'
import DashboardContent from '@/app/components/DashboardContent'
import ScanContent from '@/app/components/ScanContent'
import VoiceContent from '@/app/components/VoiceContent'
import TransactionsContent from '@/app/components/TransactionsContent'
import CustomersContent from '@/app/components/CustomersContent'
import SettingsContent from '@/app/components/SettingsContent'
import BusinessInsights from '@/app/components/BusinessInsights'
import StockInventory from '@/app/components/StockInventory'
import StockImporter from '@/app/components/StockImporter'
import StockSales from '@/app/components/StockSales'
import StockAlerts from '@/app/components/StockAlerts'
// ✅ NEW: Import Stock Alert Widget
import StockAlertWidget from '@/app/components/StockAlertWidget'

interface UserData {
  id: string
  name: string
  email: string
  businessName: string | null
  phone: string | null
}

const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  scan: 'Scan to Ledger',
  voice: 'Voice to Ledger',
  transactions: 'Transactions',
  customers: 'Customers',
  insights: 'Business Insights',
  stock: 'Stock Management',
  settings: 'Settings',
}

export default function Home() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<UserData | null>(null)
  const [transactions, setTransactions] = useState([])
  const [topCustomers, setTopCustomers] = useState([])
  const [customers, setCustomers] = useState([])
  const [stats, setStats] = useState({
    totalSales: 0,
    totalDebt: 0,
    totalTransactions: 0,
    outstandingCustomers: 0,
  })
  const [loading, setLoading] = useState(false)
  const [lastVoiceResult, setLastVoiceResult] = useState<{
    transcript?: string
    customerName: string
    product: string
    amount: number
    type: 'credit' | 'debit'
  } | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Stock state
  const [stockItems, setStockItems] = useState([])
  const [stockAlerts, setStockAlerts] = useState([])
  const [stockTab, setStockTab] = useState<'inventory' | 'import' | 'sales' | 'alerts'>('inventory')

  const getAuthHeaders = (isFormData: boolean = false): Record<string, string> => {
    const token = localStorage.getItem('token')
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    }
    if (!isFormData) {
      headers['Content-Type'] = 'application/json'
    }
    return headers
  }

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    fetch('/api/auth/me', {
      headers: getAuthHeaders(),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Invalid token')
        return res.json()
      })
      .then((data) => {
        if (data?.user) {
          setUser(data.user)
          setIsLoading(false)
          fetchDashboard()
          fetchStockData()
          fetchStockAlerts()
        }
      })
      .catch(() => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        router.push('/login')
      })
  }, [router])

  const fetchDashboard = async () => {
    try {
      const [dashboardRes, customersRes] = await Promise.all([
        fetch('/api/dashboard', { headers: getAuthHeaders() }),
        fetch('/api/customers', { headers: getAuthHeaders() }),
      ])

      if (dashboardRes.status === 401 || customersRes.status === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        router.push('/login')
        return
      }

      const data = await dashboardRes.json()
      setTransactions(data.transactions || [])
      setTopCustomers(data.topCustomers || [])
      setStats(
        data.stats || {
          totalSales: 0,
          totalDebt: 0,
          totalTransactions: 0,
          outstandingCustomers: 0,
        }
      )

      const customersData = await customersRes.json()
      setCustomers(customersData.customers || [])
    } catch (error) {
      console.error('Dashboard Error:', error)
      toast.error('Failed to load dashboard')
    }
  }

  const fetchStockData = async () => {
    try {
      const res = await fetch('/api/stock', { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setStockItems(data.items || [])
      }
    } catch (error) {
      console.error('Stock Fetch Error:', error)
    }
  }

  const fetchStockAlerts = async () => {
    try {
      const res = await fetch('/api/stock/alerts', { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setStockAlerts(data.alerts || [])
      }
    } catch (error) {
      console.error('Alerts Fetch Error:', error)
    }
  }

  const handlePhotoUpload = async (file: File) => {
    setLoading(true)
    const formData = new FormData()
    formData.append('image', file)

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: getAuthHeaders(true),
        body: formData,
      })

      if (res.ok) {
        toast.success('Transaction added from photo')
        await fetchDashboard()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to process image')
      }
    } catch (error) {
      toast.error('Network error')
    } finally {
      setLoading(false)
    }
  }

  const handleAudioRecorded = async (audioBlob: Blob) => {
    setLoading(true)
    const formData = new FormData()
    const ext = audioBlob.type.includes('mp4') ? 'm4a' : audioBlob.type.includes('ogg') ? 'ogg' : 'webm'
    formData.append('audio', audioBlob, `recording.${ext}`)

    try {
      const res = await fetch('/api/voice/audio', {
        method: 'POST',
        headers: getAuthHeaders(true),
        body: formData,
      })

      const data = await res.json()

      if (res.ok) {
        setLastVoiceResult({
          transcript: data.transcript,
          customerName: data.transaction.customer.name,
          product: data.transaction.product,
          amount: data.transaction.amount,
          type: data.transaction.type,
        })
        toast.success('Transaction added from voice')
        await fetchDashboard()
      } else {
        toast.error(data.error || 'Failed to process voice')
      }
    } catch (error) {
      toast.error('Network error')
    } finally {
      setLoading(false)
    }
  }

  const markAsPaid = async (id: string) => {
    try {
      const res = await fetch('/api/transactions', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id, status: 'paid' }),
      })

      if (res.ok) {
        toast.success('Marked as paid')
        await fetchDashboard()
      }
    } catch (error) {
      toast.error('Failed to update')
    }
  }

  const addSampleTransaction = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/voice', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          text: 'Kebede bought 2 bags of teff on credit for 16000 Birr',
        }),
      })
      if (res.ok) {
        toast.success('Sample transaction added')
        await fetchDashboard()
      } else {
        toast.error('Failed to add sample')
      }
    } catch (error) {
      toast.error('Network error')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    toast.success('Logged out successfully')
    router.push('/login')
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FBF9F5]">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-[3px] border-[#0F6B4C]/15 border-t-[#0F6B4C]" />
          <p className="mt-4 text-[13.5px] font-medium text-[#1F2A24]/50">Loading EthioGenz…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F4F1EA]">
      <Navigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        user={user}
        onLogout={handleLogout}
        onCollapsedChange={setSidebarCollapsed}
      />

      <div
        className={`transition-[margin] duration-300 ease-out md:p-8 ${
          sidebarCollapsed ? 'md:ml-[76px]' : 'md:ml-64'
        }`}
      >
        <div className="mx-auto max-w-4xl">
          <div className="h-16 md:hidden" />

          <div className="p-4 md:p-0">
            <div className="mb-6">
              <h1 className="font-serif text-2xl font-bold tracking-tight text-[#1F2A24] md:text-3xl">
                {PAGE_TITLES[activeTab]}
              </h1>
            </div>

            {activeTab === 'dashboard' && (
              <>
                {/* ✅ NEW: Stock Alert Widget - Shows at top of dashboard */}
                <div className="mb-4">
                  <StockAlertWidget onViewAll={() => setActiveTab('stock')} />
                </div>
                <DashboardContent
                  stats={stats}
                  transactions={transactions}
                  topCustomers={topCustomers}
                  onMarkAsPaid={markAsPaid}
                  onAddSample={addSampleTransaction}
                  isLoading={loading}
                />
              </>
            )}

            {activeTab === 'scan' && <ScanContent onPhotoUpload={handlePhotoUpload} isLoading={loading} />}

            {activeTab === 'voice' && (
              <VoiceContent onAudioRecorded={handleAudioRecorded} isLoading={loading} lastResult={lastVoiceResult} />
            )}

            {activeTab === 'transactions' && (
              <TransactionsContent transactions={transactions} onMarkAsPaid={markAsPaid} />
            )}

            {activeTab === 'customers' && <CustomersContent customers={customers} transactions={transactions} />}

            {activeTab === 'insights' && (
              <BusinessInsights
                transactions={transactions}
                stats={stats}
                onRefresh={fetchDashboard}
                isLoading={loading}
              />
            )}

            {activeTab === 'stock' && (
              <div className="space-y-4">
                <div className="flex gap-1 bg-white rounded-xl border border-black/5 p-1">
                  {[
                    { id: 'inventory', label: 'Inventory' },
                    { id: 'import', label: 'Add Items' },
                    { id: 'sales', label: 'Sales' },
                    { id: 'alerts', label: 'Alerts' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setStockTab(tab.id as any)}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition ${
                        stockTab === tab.id
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-[#1F2A24]/60 hover:bg-gray-50'
                      }`}
                    >
                      {tab.label} {tab.id === 'alerts' && stockAlerts.length > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-red-500 text-white rounded-full">
                          {stockAlerts.length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {stockTab === 'inventory' && (
                  <StockInventory
                    items={stockItems}
                    onRefresh={() => {
                      fetchStockData()
                      fetchStockAlerts()
                    }}
                    onUpdateItem={() => {
                      fetchStockData()
                      fetchStockAlerts()
                    }}
                  />
                )}

                {stockTab === 'import' && (
                  <StockImporter
                    onImportComplete={() => {
                      fetchStockData()
                      fetchStockAlerts()
                    }}
                  />
                )}

                {stockTab === 'sales' && (
                  <StockSales
                    items={stockItems}
                    onSaleComplete={() => {
                      fetchStockData()
                      fetchStockAlerts()
                    }}
                  />
                )}

                {stockTab === 'alerts' && (
                  <StockAlerts
                    alerts={stockAlerts}
                    onDismiss={fetchStockAlerts}
                    onRefresh={fetchStockAlerts}
                  />
                )}
              </div>
            )}

            {activeTab === 'settings' && <SettingsContent user={user} />}
          </div>
        </div>
      </div>

      <div className="h-20 md:hidden" />
    </div>
  )
}