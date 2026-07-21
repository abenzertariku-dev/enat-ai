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

export default function Home() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<UserData | null>(null)
  const [transactions, setTransactions] = useState([])
  const [stats, setStats] = useState({
    totalSales: 0,
    totalDebt: 0,
    totalTransactions: 0,
    outstandingCustomers: 0
  })
  const [loading, setLoading] = useState(false)
  const [voiceText, setVoiceText] = useState('')
  const [isRecording, setIsRecording] = useState(false)

  const getAuthHeaders = (isFormData: boolean = false): Record<string, string> => {
    const token = localStorage.getItem('token')
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`
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
      headers: getAuthHeaders()
    })
    .then(res => {
      if (!res.ok) throw new Error('Invalid token')
      return res.json()
    })
    .then(data => {
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
        headers: getAuthHeaders()
      })
      if (res.status === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        router.push('/login')
        return
      }
      const data = await res.json()
      setTransactions(data.transactions || [])
      setStats(data.stats || {
        totalSales: 0,
        totalDebt: 0,
        totalTransactions: 0,
        outstandingCustomers: 0
      })
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
        body: formData
      })

      if (res.ok) {
        toast.success('✅ Transaction added from photo!')
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

  const startVoiceRecording = () => {
    if (!('webkitSpeechRecognition' in window)) {
      toast.error('Voice recognition not supported. Try Chrome.')
      return
    }

    setIsRecording(true)
    const recognition = new (window as any).webkitSpeechRecognition()
    recognition.lang = 'am-ET'
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onresult = async (event: any) => {
      const text = event.results[0][0].transcript
      setVoiceText(text)
      setIsRecording(false)

      try {
        const res = await fetch('/api/voice', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ text })
        })

        if (res.ok) {
          toast.success('🎤 Transaction added from voice!')
          await fetchDashboard()
        } else {
          const data = await res.json()
          toast.error(data.error || 'Failed to process voice')
        }
      } catch (error) {
        toast.error('Network error')
      }
    }

    recognition.onerror = () => {
      setIsRecording(false)
      toast.error('Voice recognition failed. Please try again.')
    }

    recognition.start()
  }

  const markAsPaid = async (id: string) => {
    try {
      const res = await fetch('/api/transactions', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id, status: 'paid' })
      })

      if (res.ok) {
        toast.success('✅ Marked as paid!')
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
          text: "Kebede bought 2 bags of teff on credit for 16000 Birr" 
        })
      })
      if (res.ok) {
        toast.success('📊 Sample transaction added!')
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading EthioGenz...</p>
        </div>
      </div>
    )
  }

  // Main content with sidebar
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <Navigation 
        activeTab={activeTab}
        onTabChange={setActiveTab}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <div className="md:ml-64 md:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Mobile spacing */}
          <div className="h-16 md:h-0"></div>
          
          <div className="p-4 md:p-0">
            <div className="mb-6">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                {activeTab === 'dashboard' && '📊 Dashboard'}
                {activeTab === 'scan' && '📸 Scan to Ledger'}
                {activeTab === 'voice' && '🎙 Voice to Ledger'}
                {activeTab === 'transactions' && '📋 Transactions'}
                {activeTab === 'customers' && '👥 Customers'}
                {activeTab === 'settings' && '⚙️ Settings'}
              </h1>
            </div>

            {activeTab === 'dashboard' && (
              <DashboardContent 
                stats={stats}
                transactions={transactions}
                onMarkAsPaid={markAsPaid}
                onAddSample={addSampleTransaction}
                isLoading={loading}
              />
            )}

            {activeTab === 'scan' && (
              <ScanContent 
                onPhotoUpload={handlePhotoUpload}
                isLoading={loading}
              />
            )}

            {activeTab === 'voice' && (
              <VoiceContent 
                isRecording={isRecording}
                onStartRecording={startVoiceRecording}
                voiceText={voiceText}
                isLoading={loading}
              />
            )}

            {activeTab === 'transactions' && (
              <TransactionsContent 
                transactions={transactions}
                onMarkAsPaid={markAsPaid}
              />
            )}

            {activeTab === 'customers' && (
              <CustomersContent 
                transactions={transactions}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsContent 
                user={user}
              />
            )}
          </div>
        </div>
      </div>

      {/* Mobile bottom padding for navigation */}
      <div className="h-20 md:hidden"></div>
    </div>
  )
}