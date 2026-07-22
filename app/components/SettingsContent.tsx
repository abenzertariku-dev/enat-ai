'use client'

import { useState } from 'react'
import { User, Building2, Phone, Mail, Shield, Bell, Moon, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'

interface SettingsContentProps {
  user: {
    name: string
    email: string
    businessName?: string | null
    phone?: string | null
  } | null
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean
  onChange?: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      role="switch"
      aria-checked={checked}
      className={`relative h-6 w-12 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        checked ? 'bg-[#0F6B4C]' : 'bg-black/15'
      }`}
    >
      <div
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
          checked ? 'left-6' : 'left-0.5'
        }`}
      />
    </button>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <Icon size={16} className="text-[#1F2A24]/35" />
      <div>
        <p className="text-[11px] text-[#1F2A24]/45">{label}</p>
        <p className="font-medium text-[#1F2A24]">{value}</p>
      </div>
    </div>
  )
}

export default function SettingsContent({ user }: SettingsContentProps) {
  const [notifications, setNotifications] = useState(true)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const submitPasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters')
      return
    }

    setIsSaving(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()

      if (res.ok) {
        toast.success('Password updated')
        setShowPasswordForm(false)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        toast.error(data.error || 'Failed to change password')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <h2 className="text-lg font-bold tracking-tight text-[#1F2A24]">Settings</h2>
        <p className="mt-1 text-sm text-[#1F2A24]/50">Manage your account and preferences</p>
      </div>

      {/* Profile */}
      <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <h3 className="mb-3 flex items-center gap-2 text-[13.5px] font-semibold text-[#1F2A24]">
          <User size={16} className="text-[#0F6B4C]" />
          Profile information
        </h3>
        <div className="space-y-3">
          <InfoRow icon={User} label="Name" value={user?.name || '—'} />
          <InfoRow icon={Mail} label="Email" value={user?.email || '—'} />
          {user?.businessName && <InfoRow icon={Building2} label="Business" value={user.businessName} />}
          {user?.phone && <InfoRow icon={Phone} label="Phone" value={user.phone} />}
        </div>
      </div>

      {/* Preferences */}
      <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <h3 className="mb-3 flex items-center gap-2 text-[13.5px] font-semibold text-[#1F2A24]">
          <Bell size={16} className="text-[#0F6B4C]" />
          Preferences
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-[#1F2A24]">Payment reminders</p>
              <p className="text-[11.5px] text-[#1F2A24]/45">Get notified about unpaid balances</p>
            </div>
            <Toggle checked={notifications} onChange={() => setNotifications((v) => !v)} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-[#1F2A24]/50">Dark mode</p>
              <p className="text-[11.5px] text-[#1F2A24]/35">Coming soon</p>
            </div>
            <Toggle checked={false} disabled />
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <h3 className="mb-3 flex items-center gap-2 text-[13.5px] font-semibold text-[#1F2A24]">
          <Shield size={16} className="text-[#0F6B4C]" />
          Security
        </h3>

        {!showPasswordForm ? (
          <button
            onClick={() => setShowPasswordForm(true)}
            className="w-full rounded-xl bg-[#FBF9F5] px-4 py-3 text-left transition hover:bg-[#F3EFE6]"
          >
            <p className="text-[13px] font-medium text-[#1F2A24]">Change password</p>
            <p className="text-[11.5px] text-[#1F2A24]/45">Update your account password</p>
          </button>
        ) : (
          <div className="space-y-2.5 rounded-xl bg-[#FBF9F5] p-4">
            <input
              type="password"
              placeholder="Current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-[13.5px] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#0F6B4C]/40"
            />
            <input
              type="password"
              placeholder="New password (min 8 characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-[13.5px] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#0F6B4C]/40"
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-[13.5px] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#0F6B4C]/40"
            />
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => {
                  setShowPasswordForm(false)
                  setCurrentPassword('')
                  setNewPassword('')
                  setConfirmPassword('')
                }}
                disabled={isSaving}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-[13px] font-medium text-[#1F2A24]/60 transition hover:bg-black/5 disabled:opacity-50"
              >
                <X size={14} />
                Cancel
              </button>
              <button
                onClick={submitPasswordChange}
                disabled={isSaving}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#0F6B4C] px-3 py-2.5 text-[13px] font-medium text-white transition hover:bg-[#0B5A3F] disabled:opacity-50"
              >
                <Check size={14} />
                {isSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}