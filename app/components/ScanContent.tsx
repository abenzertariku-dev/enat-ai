'use client'

import { useRef, useState, useCallback } from 'react'
import { Camera, Upload, X, ImageIcon, AlertCircle } from 'lucide-react'

interface ScanContentProps {
  onPhotoUpload: (file: File) => void
  isLoading: boolean
}

const MAX_BYTES = 8 * 1024 * 1024 // 8MB — must match app/api/upload/route.ts
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`
}

export default function ScanContent({ onPhotoUpload, isLoading }: ScanContentProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<{ url: string; file: File } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const validate = (file: File): string | null => {
    if (file.type && !ACCEPTED_TYPES.includes(file.type)) {
      return 'Unsupported file type. Use JPG, PNG, WebP, or HEIC.'
    }
    if (file.size > MAX_BYTES) {
      return `File is too large (${formatSize(file.size)}). Max size is 8 MB.`
    }
    return null
  }

  const handleFile = useCallback((file: File) => {
    const validationError = validate(file)
    if (validationError) {
      setError(validationError)
      setPreview(null)
      return
    }
    setError(null)
    setPreview({ url: URL.createObjectURL(file), file })
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const clearPreview = () => {
    if (preview) URL.revokeObjectURL(preview.url)
    setPreview(null)
  }

  const submit = () => {
    if (preview) onPhotoUpload(preview.file)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <h2 className="text-lg font-bold tracking-tight text-[#1F2A24]">Scan to ledger</h2>
        <p className="mt-1 text-sm text-[#1F2A24]/50">
          Photograph a handwritten notebook page or receipt — the AI reads it for you.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`rounded-2xl border-2 border-dashed p-8 transition-colors ${
          isDragging ? 'border-[#0F6B4C] bg-[#0F6B4C]/[0.04]' : 'border-black/10 bg-white'
        }`}
      >
        {!preview ? (
          <div className="flex flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-28 w-28 items-center justify-center rounded-full bg-[#0F6B4C]/10">
              <Camera size={40} className="text-[#0F6B4C]" />
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 rounded-xl bg-[#0F6B4C] px-7 py-3.5 font-medium text-white transition hover:bg-[#0B5A3F]"
            >
              <Upload size={18} />
              Upload photo
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />

            <p className="mt-3 text-[12px] text-[#1F2A24]/35">
              or drag a photo here · JPG, PNG, WebP · max 8 MB
            </p>

            {error && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-[#C1442E]/10 px-3 py-2 text-[12.5px] font-medium text-[#C1442E]">
                <AlertCircle size={14} className="shrink-0" />
                {error}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="relative w-full max-w-sm overflow-hidden rounded-xl border border-black/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview.url} alt="Selected ledger photo" className="max-h-72 w-full object-contain bg-[#FBF9F5]" />
              <button
                onClick={clearPreview}
                disabled={isLoading}
                className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white transition hover:bg-black/75 disabled:opacity-50"
                aria-label="Remove photo"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-2 flex items-center gap-1.5 text-[12px] text-[#1F2A24]/45">
              <ImageIcon size={12} />
              <span className="max-w-[220px] truncate">{preview.file.name}</span>
              <span>· {formatSize(preview.file.size)}</span>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={clearPreview}
                disabled={isLoading}
                className="rounded-xl px-5 py-3 text-sm font-medium text-[#1F2A24]/60 transition hover:bg-black/5 disabled:opacity-50"
              >
                Retake
              </button>
              <button
                onClick={submit}
                disabled={isLoading}
                className="rounded-xl bg-[#0F6B4C] px-7 py-3 text-sm font-medium text-white transition hover:bg-[#0B5A3F] disabled:opacity-50"
              >
                {isLoading ? 'Reading photo…' : 'Add to ledger'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-[#0F6B4C]/15 bg-[#0F6B4C]/[0.05] p-4">
        <h3 className="text-[13px] font-semibold text-[#0F6B4C]">How it works</h3>
        <ol className="mt-1.5 list-inside list-decimal space-y-1 text-[13px] text-[#1F2A24]/60">
          <li>Photograph your handwritten ledger page</li>
          <li>AI reads the text and pulls out customer, product, and amount</li>
          <li>The transaction is added to your ledger automatically</li>
        </ol>
      </div>
    </div>
  )
}
