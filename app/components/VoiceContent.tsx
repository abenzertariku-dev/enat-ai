'use client'

import { useRef, useState } from 'react'
import { Mic, Square, AlertCircle, FileAudio } from 'lucide-react'

interface VoiceResult {
  transcript?: string
  customerName: string
  product: string
  amount: number
  type: 'credit' | 'debit'
}

interface VoiceContentProps {
  /** Called with the recorded audio once the user stops recording. Parent uploads it and refreshes the dashboard. */
  onAudioRecorded: (audio: Blob) => void
  isLoading: boolean
  /** Set by the parent once the upload finishes, so this screen can show what was understood. */
  lastResult?: VoiceResult | null
}

const EXAMPLE_PHRASES = [
  '"Kebede bought 2 bags of teff on credit for 16,000 Birr"',
  '"Almaz paid 500 Birr for coffee"',
  '"ከበደ በ 16000 ብር እዳ 2 ኩንታል ጤፍ ገዛ"',
]

export default function VoiceContent({ onAudioRecorded, isLoading, lastResult }: VoiceContentProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  const startRecording = async () => {
    setError(null)
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Microphone access is not supported in this browser.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []

      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        streamRef.current?.getTracks().forEach((track) => track.stop())
        streamRef.current = null
        if (blob.size > 0) onAudioRecorded(blob)
      }

      recorder.start()
      setIsRecording(true)
    } catch {
      setError('Microphone permission was denied. Allow mic access and try again.')
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <h2 className="text-lg font-bold tracking-tight text-[#1F2A24]">Voice to ledger</h2>
        <p className="mt-1 text-sm text-[#1F2A24]/50">
          Speak in Amharic or English — the recording is sent to the AI directly, not transcribed by
          your browser first, so Amharic comes through much more reliably.
        </p>
      </div>

      <div className="rounded-2xl border border-black/5 bg-white p-8">
        <div className="flex flex-col items-center justify-center">
          <div className="relative">
            <div
              className={`flex h-32 w-32 items-center justify-center rounded-full transition-all ${
                isRecording ? 'bg-[#C1442E]/10' : 'bg-[#0F6B4C]/10'
              }`}
            >
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isLoading}
                className={`flex h-24 w-24 items-center justify-center rounded-full transition-all disabled:opacity-50 ${
                  isRecording ? 'bg-[#C1442E] hover:bg-[#A73A26]' : 'bg-[#0F6B4C] hover:bg-[#0B5A3F]'
                }`}
              >
                {isRecording ? <Square size={28} className="text-white" /> : <Mic size={32} className="text-white" />}
              </button>
            </div>
            {isRecording && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#C1442E]/60" />
                <span className="relative inline-flex h-4 w-4 rounded-full bg-[#C1442E]" />
              </span>
            )}
          </div>

          <p className="mt-4 text-[13.5px] font-medium text-[#1F2A24]">
            {isLoading ? 'Listening and extracting…' : isRecording ? 'Recording — tap to stop' : 'Tap the mic to start'}
          </p>

          <p className="mt-1 text-[12px] text-[#1F2A24]/40">
            {isRecording
              ? 'Describe the transaction, then tap the square to finish'
              : 'Amharic and English both work'}
          </p>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-[#C1442E]/10 px-3 py-2 text-[12.5px] font-medium text-[#C1442E]">
              <AlertCircle size={14} className="shrink-0" />
              {error}
            </div>
          )}
        </div>
      </div>

      {lastResult && (
        <div className="rounded-2xl border border-[#0F6B4C]/15 bg-[#0F6B4C]/[0.05] p-4">
          {lastResult.transcript && (
            <div className="mb-2 flex items-start gap-2 text-[12.5px] text-[#1F2A24]/60">
              <FileAudio size={14} className="mt-0.5 shrink-0 text-[#0F6B4C]" />
              <span>"{lastResult.transcript}"</span>
            </div>
          )}
          <p className="text-[13.5px] font-semibold text-[#1F2A24]">
            {lastResult.customerName} · {lastResult.product}
          </p>
          <p className={`text-[13px] font-medium ${lastResult.type === 'credit' ? 'text-[#C1442E]' : 'text-[#0F6B4C]'}`}>
            {lastResult.amount.toLocaleString()} Br · {lastResult.type === 'credit' ? 'On credit' : 'Paid'}
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-[#E5A823]/25 bg-[#E5A823]/[0.08] p-4">
        <h3 className="text-[13px] font-semibold text-[#B8860B]">Example phrases</h3>
        <ul className="mt-1.5 list-inside list-disc space-y-1 text-[13px] text-[#1F2A24]/60">
          {EXAMPLE_PHRASES.map((phrase) => (
            <li key={phrase}>{phrase}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}