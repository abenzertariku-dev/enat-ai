'use client'

import { Settings, User, Building2, Phone, Mail, Shield, Bell, Moon } from 'lucide-react'

interface SettingsContentProps {
  user: {
    name: string
    email: string
    businessName?: string | null
    phone?: string | null
  } | null
}

export default function SettingsContent({ user }: SettingsContentProps) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h2 className="text-xl font-bold text-gray-800 mb-2">⚙️ Settings</h2>
        <p className="text-gray-500 text-sm">Manage your account preferences</p>
      </div>

      {/* Profile Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h3 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
          <User size={18} className="text-emerald-600" />
          Profile Information
        </h3>
        
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <User size={16} className="text-gray-400" />
            <div>
              <p className="text-gray-500 text-xs">Name</p>
              <p className="font-medium">{user?.name}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 text-sm">
            <Mail size={16} className="text-gray-400" />
            <div>
              <p className="text-gray-500 text-xs">Email</p>
              <p className="font-medium">{user?.email}</p>
            </div>
          </div>
          
          {user?.businessName && (
            <div className="flex items-center gap-3 text-sm">
              <Building2 size={16} className="text-gray-400" />
              <div>
                <p className="text-gray-500 text-xs">Business</p>
                <p className="font-medium">{user.businessName}</p>
              </div>
            </div>
          )}
          
          {user?.phone && (
            <div className="flex items-center gap-3 text-sm">
              <Phone size={16} className="text-gray-400" />
              <div>
                <p className="text-gray-500 text-xs">Phone</p>
                <p className="font-medium">{user.phone}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preferences */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h3 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
          <Bell size={18} className="text-emerald-600" />
          Preferences
        </h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Dark Mode</p>
              <p className="text-xs text-gray-500">Toggle dark theme</p>
            </div>
            <button className="w-12 h-6 bg-gray-200 rounded-full relative">
              <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5 shadow"></div>
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Notifications</p>
              <p className="text-xs text-gray-500">Payment reminders</p>
            </div>
            <button className="w-12 h-6 bg-emerald-500 rounded-full relative">
              <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5 shadow"></div>
            </button>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h3 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
          <Shield size={18} className="text-emerald-600" />
          Security
        </h3>
        
        <button className="w-full text-left px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
          <p className="font-medium text-sm">Change Password</p>
          <p className="text-xs text-gray-500">Update your password</p>
        </button>
      </div>
    </div>
  )
}