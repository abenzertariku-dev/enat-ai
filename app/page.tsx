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
  settings: 'Settings',
}

export default function Home() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<UserData | null>(null)
  const [transactions, setTransactions] = useState([])
  const [topCustomers, setTopCustomers] = useState([])
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
      const res = await fetch('/api/dashboard', {
        headers: getAuthHeaders(),
      })
      if (res.status === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        router.push('/login')
        return
      }
      const data = await res.json()
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
    } catch (error) {
      console.error('Dashboard Error:', error)
      toast.error('Failed to load dashboard')
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

      {/* Main content — margin tracks the sidebar's collapsed width on desktop */}
      <div
        className={`transition-[margin] duration-300 ease-out md:p-8 ${
          sidebarCollapsed ? 'md:ml-[76px]' : 'md:ml-64'
        }`}
      >
        <div className="mx-auto max-w-4xl">
          {/* Mobile top-bar spacing */}
          <div className="h-16 md:hidden" />

          <div className="p-4 md:p-0">
            <div className="mb-6">
              <h1 className="font-serif text-2xl font-bold tracking-tight text-[#1F2A24] md:text-3xl">
                {PAGE_TITLES[activeTab]}
              </h1>
            </div>

            {activeTab === 'dashboard' && (
              <DashboardContent
                stats={stats}
                transactions={transactions}
                topCustomers={topCustomers}
                onMarkAsPaid={markAsPaid}
                onAddSample={addSampleTransaction}
                isLoading={loading}
              />
            )}

            {activeTab === 'scan' && <ScanContent onPhotoUpload={handlePhotoUpload} isLoading={loading} />}

            {activeTab === 'voice' && (
              <VoiceContent onAudioRecorded={handleAudioRecorded} isLoading={loading} lastResult={lastVoiceResult} />
            )}

            {activeTab === 'transactions' && (
              <TransactionsContent transactions={transactions} onMarkAsPaid={markAsPaid} />
            )}

            {activeTab === 'customers' && <CustomersContent transactions={transactions} />}

            {activeTab === 'settings' && <SettingsContent user={user} />}
          </div>
        </div>
      </div>

      {/* Mobile bottom-nav spacing */}
      <div className="h-20 md:hidden" />
    </div>
  )
}