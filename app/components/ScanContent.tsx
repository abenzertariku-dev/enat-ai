'use client'

import { useRef } from 'react'
import { Camera, Upload } from 'lucide-react'

interface ScanContentProps {
  onPhotoUpload: (file: File) => void
  isLoading: boolean
}

export default function ScanContent({ onPhotoUpload, isLoading }: ScanContentProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onPhotoUpload(file)
    }
    e.target.value = ''
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-2">📸 Scan to Ledger</h2>
        <p className="text-gray-500 text-sm">
          Take a photo of your handwritten notebook or receipt
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <div className="flex flex-col items-center justify-center">
          <div className="w-32 h-32 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
            <Camera size={48} className="text-emerald-600" />
          </div>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="bg-emerald-600 text-white px-8 py-4 rounded-xl font-medium hover:bg-emerald-700 transition disabled:opacity-50 flex items-center gap-2"
          >
            <Upload size={20} />
            {isLoading ? 'Processing...' : 'Upload Photo'}
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
          
          <p className="text-xs text-gray-400 mt-4">
            Supports JPG, PNG, WebP • Max 10MB
          </p>
        </div>
      </div>

      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
        <h3 className="font-medium text-emerald-800 mb-1">💡 How it works</h3>
        <ol className="text-sm text-emerald-700 space-y-1 list-decimal list-inside">
          <li>Take a photo of your handwritten ledger</li>
          <li>AI reads the text and extracts customer, product, amount</li>
          <li>Transaction is automatically added to your ledger</li>
        </ol>
      </div>
    </div>
  )
}