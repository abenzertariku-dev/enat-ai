'use client'

import { useState, useRef } from 'react'
import { Mic, MicOff, Play, Square, Check, X, RefreshCw, AlertCircle, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { useI18n } from '@/lib/i18n'

interface VoiceContentProps {
  onAudioRecorded: (audioBlob: Blob) => Promise<void>
  isLoading: boolean
  lastResult?: {
    transcript?: string
    customerName: string
    product: string
    amount: number
    type: 'credit' | 'debit'
  } | null
}

export default function VoiceContent({ onAudioRecorded, isLoading, lastResult }: VoiceContentProps) {
  const { t } = useI18n()
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [showReview, setShowReview] = useState(false)
  const [reviewData, setReviewData] = useState<any>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // ─── Recording Functions ──────────────────────────────────────────

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        processAudio(blob)
        
        // Clean up
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)

      toast.success(t('voice.recording'), {
        icon: '🎙️',
        duration: 3000,
      })
    } catch (error) {
      console.error('Microphone Error:', error)
      toast.error(t('voice.micError'))
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }

  // ─── Process Audio ─────────────────────────────────────────────────

  const processAudio = async (blob: Blob) => {
    setIsProcessing(true)
    setShowReview(false)
    
    try {
      const token = localStorage.getItem('token')
      const formData = new FormData()
      const ext = blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm'
      formData.append('audio', blob, `recording.${ext}`)

      const res = await fetch('/api/voice/transcribe', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      })

      const data = await res.json()

      if (res.ok) {
        // Show review screen with extracted data
        setReviewData({
          transcript: data.transcript || t('common.unknown'),
          customerName: data.extracted?.customerName || t('common.unknown'),
          product: data.extracted?.product || t('common.unknown'),
          amount: data.extracted?.amount || 0,
          type: data.extracted?.type || 'credit',
          description: data.extracted?.description || '',
          rawText: data.transcript || '',
          confidence: data.confidence || 0.85
        })
        setShowReview(true)
      } else {
        toast.error(data.error || t('toast.voiceFail'))
        // Reset so user can try again
        setAudioBlob(null)
      }
    } catch (error) {
      console.error('Process Error:', error)
      toast.error(t('common.networkError'))
    } finally {
      setIsProcessing(false)
    }
  }

  // ─── Review Actions ─────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!audioBlob) return
    
    setIsProcessing(true)
    try {
      await onAudioRecorded(audioBlob)
      setShowReview(false)
      setAudioBlob(null)
      setReviewData(null)
      toast.success(t('toast.voiceOk'), {
        icon: '✅',
        duration: 3000,
      })
    } catch (error) {
      toast.error(t('toast.txFailed'))
    } finally {
      setIsProcessing(false)
    }
  }

  // ✅ FIXED: Use toast() with icon instead of toast.info()
  const handleCancel = () => {
    setShowReview(false)
    setAudioBlob(null)
    setReviewData(null)
    toast(t('voice.cancelRec'), {
      icon: 'ℹ️',
      duration: 3000,
    })
  }

  const handleRetry = () => {
    setShowReview(false)
    setAudioBlob(null)
    setReviewData(null)
    // Start recording again
    startRecording()
  }

  // ─── Format Time ────────────────────────────────────────────────────

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-black/5 p-6 shadow-sm">
        <h2 className="text-lg font-bold tracking-tight text-[#1F2A24] flex items-center gap-2">
          <Mic className="text-emerald-600" size={20} />
          {t('voice.title')}
        </h2>
        <p className="mt-1 text-sm text-[#1F2A24]/50">
          {isRecording ? `🔴 ${t('voice.recording')}` : t('voice.subtitle')}
        </p>
      </div>

      {/* ─── RECORDING VIEW ──────────────────────────────────────────── */}
      {!showReview && !isProcessing && (
        <div className="bg-white rounded-2xl border border-black/5 p-8 shadow-sm text-center">
          <div className="flex flex-col items-center">
            {/* Timer */}
            {isRecording && (
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-sm font-mono text-gray-600">{formatTime(recordingTime)}</span>
                </div>
                <span className="text-sm text-gray-400">• {t('voice.recording')}</span>
              </div>
            )}

            {/* Mic Button */}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isLoading || isProcessing}
              className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all ${
                isRecording
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              } disabled:opacity-50`}
            >
              {isRecording ? (
                <Square size={32} className="text-white" />
              ) : (
                <Mic size={32} className="text-white" />
              )}
              
              {/* Ripple effect when recording */}
              {isRecording && (
                <>
                  <span className="absolute inset-0 rounded-full border-4 border-red-300 animate-ping opacity-75" />
                  <span className="absolute inset-0 rounded-full border-4 border-red-200 animate-ping opacity-50 delay-300" />
                </>
              )}
            </button>

            <p className="mt-4 text-sm font-medium text-[#1F2A24]">
              {isRecording ? `🔴 ${t('voice.tapStop')}` : `🎤 ${t('voice.tapStart')}`}
            </p>
            <p className="text-xs text-[#1F2A24]/40 mt-1">
              {isRecording ? t('voice.recording') : t('voice.subtitle')}
            </p>

            {isRecording && (
              <button
                onClick={stopRecording}
                className="mt-4 text-xs text-red-500 hover:text-red-600 font-medium"
              >
                {t('voice.cancelRec')}
              </button>
            )}
          </div>

          {/* Previous Result */}
          {lastResult && !isRecording && !showReview && (
            <div className="mt-6 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-left">
              <p className="text-xs text-emerald-600 font-medium">{t('voice.heard')}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-medium text-[#1F2A24]">{lastResult.customerName}</span>
                <span className="text-[#1F2A24]/30">•</span>
                <span className="text-sm text-[#1F2A24]">{lastResult.product}</span>
                <span className="text-[#1F2A24]/30">•</span>
                <span className="font-bold text-emerald-600">{lastResult.amount} Br</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  lastResult.type === 'credit' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
                }`}>
                  {lastResult.type === 'credit' ? t('common.credit') : t('common.debit')}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── PROCESSING VIEW ─────────────────────────────────────────── */}
      {isProcessing && (
        <div className="bg-white rounded-2xl border border-black/5 p-12 shadow-sm text-center">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
            <p className="mt-4 font-medium text-[#1F2A24]">{t('voice.analyzing')}</p>
            <p className="text-sm text-[#1F2A24]/40">{t('voice.subtitle')}</p>
          </div>
        </div>
      )}

      {/* ─── REVIEW SCREEN ───────────────────────────────────────────── */}
      {showReview && reviewData && (
        <div className="bg-white rounded-2xl border border-black/5 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="text-emerald-600" size={20} />
            <h3 className="font-bold text-[#1F2A24]">{t('voice.review')}</h3>
            <span className="text-xs text-[#1F2A24]/40 ml-auto">
              {Math.round((reviewData.confidence || 0.85) * 100)}%
            </span>
          </div>

          {/* Transcript */}
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <p className="text-xs text-[#1F2A24]/40 mb-1">{t('voice.heard')}</p>
            <p className="text-sm text-[#1F2A24] font-medium">&quot;{reviewData.transcript}&quot;</p>
          </div>

          {/* Extracted Data */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-[10px] text-[#1F2A24]/40">{t('voice.customer')}</p>
              <p className="font-medium text-[#1F2A24]">{reviewData.customerName}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-[10px] text-[#1F2A24]/40">{t('voice.product')}</p>
              <p className="font-medium text-[#1F2A24]">{reviewData.product}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-[10px] text-[#1F2A24]/40">{t('voice.amount')}</p>
              <p className="font-bold text-emerald-600">{reviewData.amount} Br</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-[10px] text-[#1F2A24]/40">{t('voice.type')}</p>
              <p className={`font-medium ${
                reviewData.type === 'credit' ? 'text-red-600' : 'text-emerald-600'
              }`}>
                {reviewData.type === 'credit' ? t('common.credit') : t('common.debit')}
              </p>
            </div>
          </div>

          {/* Description */}
          {reviewData.description && (
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="text-[10px] text-[#1F2A24]/40">Description</p>
              <p className="text-sm text-[#1F2A24]">{reviewData.description}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handleCancel}
              disabled={isProcessing}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-black/10 text-[#1F2A24]/60 hover:bg-gray-50 transition disabled:opacity-50"
            >
              <X size={16} />
              {t('common.cancel')}
            </button>
            <button
              onClick={handleRetry}
              disabled={isProcessing}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-black/10 text-blue-600 hover:bg-blue-50 transition disabled:opacity-50"
            >
              <RefreshCw size={16} />
              {t('voice.retry')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={isProcessing}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition disabled:opacity-50"
            >
              <Check size={16} />
              {isProcessing ? t('common.saving') : t('voice.submit')}
            </button>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
        <h3 className="font-medium text-purple-800 text-sm">{t('voice.examples')}</h3>
        <ul className="text-sm text-purple-700 space-y-1 list-disc list-inside mt-1">
          <li>&quot;{t('voice.example1')}&quot;</li>
          <li>&quot;Almaz paid 500 Birr for coffee&quot;</li>
          <li>&quot;Tadesse owes 3000 Birr for sugar&quot;</li>
        </ul>
      </div>
    </div>
  )
}
