'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  Shield, Send, Phone, Clock, AlertTriangle, CheckCircle, 
  MessageCircle, X, Sparkles, TrendingUp, Calendar, 
  User, Mail, CreditCard, ArrowRight, Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useI18n } from '@/lib/i18n'

interface DebtGuardianProps {
  customerId: string
  customerName: string
  onClose: () => void
}

export default function DebtGuardian({ customerId, customerName, onClose }: DebtGuardianProps) {
  const { t } = useI18n()
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [data, setData] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'friendly' | 'professional'>('friendly')
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchDebtData()
  }, [customerId])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  const fetchDebtData = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/ai/debt-guardian?customerId=${customerId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      setData(data)
    } catch (error) {
      toast.error(t('customers.debtLoadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const sendReminder = async (message: string) => {
    setSending(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          customerId,
          message
        })
      })
      if (res.ok) {
        toast.success(`✅ ${t('customers.reminderSent')}`)
      } else {
        toast.error(t('customers.reminderFailed'))
      }
    } catch (error) {
      toast.error(t('common.networkError'))
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-emerald-600 mx-auto" />
        <p className="mt-4 text-gray-500 font-medium">{t('customers.analyzingDebt')}</p>
        <p className="text-sm text-gray-400">{t('customers.preparingInsights')}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-white rounded-2xl shadow-2xl p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">{t('customers.noDebtData')}</p>
        <p className="text-sm text-gray-400">{t('customers.noOutstanding')}</p>
        <button onClick={onClose} className="mt-4 text-emerald-600 font-medium hover:underline">
          {t('common.close')}
        </button>
      </div>
    )
  }

  const { customer, debtSummary, ai } = data
  const riskColor = debtSummary.riskLevel === 'high' ? 'text-red-600' : 
                    debtSummary.riskLevel === 'medium' ? 'text-yellow-600' : 'text-green-600'
  const riskBg = debtSummary.riskLevel === 'high' ? 'bg-red-50 border-red-200' : 
                 debtSummary.riskLevel === 'medium' ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'

  const currentMessage = activeTab === 'friendly' ? ai.friendlyMessage : ai.professionalMessage

  const riskLabel =
    debtSummary.riskLevel === 'high'
      ? t('customers.highRisk')
      : debtSummary.riskLevel === 'medium'
        ? t('customers.mediumRisk')
        : t('customers.lowRisk')

  return (
    <div ref={modalRef} className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-white/20 rounded-lg p-1.5">
              <Shield size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{t('customers.debtGuardian')}</h2>
              <p className="text-emerald-100 text-xs">{t('customers.poweredBy')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition rounded-lg hover:bg-white/10 p-1"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-lg">
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-gray-800 text-lg">{customer.name}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock size={12} />
                  <span>{t('customers.daysOverdue', { n: debtSummary.daysOverdue })}</span>
                  <span className="w-1 h-1 rounded-full bg-gray-300" />
                  <span>{t('customers.unpaidTxCount', { n: debtSummary.totalUnpaid })}</span>
                </div>
              </div>
            </div>
            <div className={`px-3 py-1.5 rounded-full border ${riskBg}`}>
              <span className={`text-xs font-bold ${riskColor}`}>
                {t('customers.riskLevel', { n: riskLabel.toUpperCase() })}
              </span>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="bg-white rounded-lg p-2.5 text-center">
              <p className="text-xs text-gray-400">{t('customers.totalDebtLabel')}</p>
              <p className="font-bold text-red-600 text-lg">{customer.totalDebt.toLocaleString()} Br</p>
            </div>
            <div className="bg-white rounded-lg p-2.5 text-center">
              <p className="text-xs text-gray-400">{t('customers.unpaidItems')}</p>
              <p className="font-bold text-gray-800 text-lg">{debtSummary.totalUnpaid}</p>
            </div>
          </div>

          {customer.phone && (
            <div className="mt-2 text-xs text-gray-400 flex items-center gap-1">
              <Phone size={12} />
              {customer.phone}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-emerald-600" />
            <h3 className="font-semibold text-gray-700 text-sm">{t('customers.aiReminders')}</h3>
          </div>

          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-3">
            <button
              onClick={() => setActiveTab('friendly')}
              className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                activeTab === 'friendly' 
                  ? 'bg-white text-emerald-700 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('customers.friendly')}
            </button>
            <button
              onClick={() => setActiveTab('professional')}
              className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                activeTab === 'professional' 
                  ? 'bg-white text-emerald-700 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('customers.professional')}
            </button>
          </div>

          <div className={`rounded-xl p-4 border ${
            activeTab === 'friendly' 
              ? 'bg-blue-50 border-blue-100' 
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle size={14} className={activeTab === 'friendly' ? 'text-blue-600' : 'text-gray-600'} />
              <p className={`text-xs font-medium ${activeTab === 'friendly' ? 'text-blue-600' : 'text-gray-600'}`}>
                {activeTab === 'friendly' ? t('customers.friendlyReminder') : t('customers.professionalNotice')}
              </p>
            </div>
            <p className="text-sm text-gray-800 font-medium">🇪🇹 {currentMessage.amharic}</p>
            <p className="text-xs text-gray-500 mt-2 border-t border-gray-200 pt-2">🇬🇧 {currentMessage.english}</p>
            <button
              onClick={() => sendReminder(currentMessage.amharic)}
              disabled={sending}
              className="mt-3 flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-emerald-700 transition disabled:opacity-50"
            >
              {sending ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Send size={12} />
              )}
              {activeTab === 'friendly' ? t('customers.sendFriendly') : t('customers.sendProfessional')}
            </button>
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={16} className="text-emerald-700" />
            <h4 className="font-semibold text-emerald-800 text-sm">{t('customers.aiRecommendation')}</h4>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-emerald-700 bg-white px-3 py-1 rounded-full">
              {ai.recommendation.action}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              ai.recommendation.priority === 'high' ? 'bg-red-100 text-red-600' :
              ai.recommendation.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' :
              'bg-green-100 text-green-600'
            }`}>
              {t('customers.priority', { n: ai.recommendation.priority.toUpperCase() })}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-2">{ai.recommendation.reason}</p>
          <p className="text-xs text-gray-500 mt-2 border-t border-emerald-200 pt-2 flex items-start gap-1">
            <AlertTriangle size={12} className="text-gray-400 mt-0.5 shrink-0" />
            {ai.riskAssessment}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {customer.phone && (
            <a
              href={`tel:${customer.phone}`}
              className="flex items-center justify-center gap-2 bg-emerald-600 text-white py-2.5 rounded-xl hover:bg-emerald-700 transition font-medium text-sm"
            >
              <Phone size={16} />
              {t('customers.call')}
            </a>
          )}
          <button
            onClick={onClose}
            className="flex items-center justify-center gap-2 bg-gray-100 text-gray-600 py-2.5 rounded-xl hover:bg-gray-200 transition font-medium text-sm"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  )
}
