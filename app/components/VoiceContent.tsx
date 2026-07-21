'use client'

import { Mic, MicOff } from 'lucide-react'

interface VoiceContentProps {
  isRecording: boolean
  onStartRecording: () => void
  voiceText: string
  isLoading: boolean
}

export default function VoiceContent({ 
  isRecording, 
  onStartRecording, 
  voiceText,
  isLoading 
}: VoiceContentProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-2">🎙 Voice to Ledger</h2>
        <p className="text-gray-500 text-sm">
          Speak in Amharic or English to add transactions
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <div className="flex flex-col items-center justify-center">
          <div className="relative">
            <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all ${
              isRecording ? 'bg-red-50 animate-pulse' : 'bg-emerald-50'
            }`}>
              <button
                onClick={onStartRecording}
                disabled={isLoading || isRecording}
                className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                  isRecording
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                } disabled:opacity-50`}
              >
                {isRecording ? (
                  <MicOff size={32} className="text-white" />
                ) : (
                  <Mic size={32} className="text-white" />
                )}
              </button>
            </div>
            {isRecording && (
              <div className="absolute -top-1 -right-1">
                <span className="flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
                </span>
              </div>
            )}
          </div>
          
          <p className="text-sm text-gray-600 mt-4 font-medium">
            {isRecording ? '🔴 Recording... Speak now' : 'Tap the mic to start'}
          </p>
          
          <p className="text-xs text-gray-400 mt-2">
            {isRecording ? 'Say something like "Kebede bought teff for 16000 Birr"' : 'Supports Amharic and English'}
          </p>
        </div>
      </div>

      {voiceText && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-xs text-blue-600 font-medium">📝 You said:</p>
          <p className="font-medium text-blue-800 mt-1">{voiceText}</p>
        </div>
      )}

      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
        <h3 className="font-medium text-purple-800 mb-1">💡 Example phrases</h3>
        <ul className="text-sm text-purple-700 space-y-1 list-disc list-inside">
          <li>"Kebede bought 2 bags of teff on credit for 16000"</li>
          <li>"Almaz paid 500 Birr for coffee"</li>
          <li>"Tadesse owes 3000 Birr for sugar"</li>
        </ul>
      </div>
    </div>
  )
}