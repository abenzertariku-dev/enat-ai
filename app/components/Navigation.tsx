'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Scan,
  Mic,
  Receipt,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronsLeft,
  ChevronsRight,
  Building2,
} from 'lucide-react'

interface NavigationProps {
  activeTab: string
  onTabChange: (tab: string) => void
  user: {
    name: string
    businessName?: string | null
    phone?: string | null
  } | null
  onLogout: () => void
  /** Optional per-tab badge counts, e.g. { customers: 4 } for unpaid balances */
  badges?: Partial<Record<string, number>>
  /** Called whenever the desktop sidebar collapses/expands, so the page can adjust its own left margin */
  onCollapsedChange?: (collapsed: boolean) => void
}

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'scan', label: 'Scan', icon: Scan },
  { id: 'voice', label: 'Voice', icon: Mic },
  { id: 'transactions', label: 'Transactions', icon: Receipt },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
]

// Small wax-seal style mark: three bands nod to the flag without being loud,
// wrapped in a coffee-cup ring — a nod to the Merkato/coffee-ceremony world
// this product lives in, standing in for the notebook emoji.
function LedgerMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <circle cx="20" cy="20" r="19" stroke="#E5A823" strokeWidth="1.5" />
      <path
        d="M20 6a14 14 0 1 0 0 28 14 14 0 0 0 0-28Z"
        fill="#0F6B4C"
      />
      <path d="M8 20a12 12 0 0 1 12-12v24A12 12 0 0 1 8 20Z" fill="#0B5A3F" />
      <path d="M13 15h14M13 20h14M13 25h9" stroke="#FBF9F5" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function Badge({ count }: { count: number }) {
  if (!count) return null
  return (
    <span className="ml-auto inline-flex min-w-[20px] items-center justify-center rounded-full bg-[#C1442E] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
      {count > 99 ? '99+' : count}
    </span>
  )
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

export default function Navigation({ activeTab, onTabChange, user, onLogout, badges, onCollapsedChange }: NavigationProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const router = useRouter()
  const navRef = useRef<HTMLDivElement>(null)
  const [indicator, setIndicator] = useState({ top: 0, height: 0 })

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const stored = window.localStorage.getItem('eg-nav-collapsed')
    if (stored) setCollapsed(stored === '1')
  }, [])

  useEffect(() => {
    window.localStorage.setItem('eg-nav-collapsed', collapsed ? '1' : '0')
    onCollapsedChange?.(collapsed)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapsed])

  // Slide a single active indicator between buttons instead of restyling each one
  useEffect(() => {
    if (!navRef.current) return
    const el = navRef.current.querySelector<HTMLElement>(`[data-tab="${activeTab}"]`)
    if (el) {
      setIndicator({ top: el.offsetTop, height: el.offsetHeight })
    }
  }, [activeTab, collapsed, isMobile])

  const go = (id: string) => {
    onTabChange(id)
    router.push(`/#${id}`)
  }

  // ---------- Desktop sidebar ----------
  if (!isMobile) {
    return (
      <div
        className={`fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-black/5 bg-[#FBF9F5] shadow-[1px_0_0_0_rgba(0,0,0,0.02)] transition-[width] duration-300 ease-out ${
          collapsed ? 'w-[76px]' : 'w-64'
        }`}
        style={{
          backgroundImage:
            'repeating-linear-gradient(180deg, rgba(15,107,76,0.035) 0px, rgba(15,107,76,0.035) 1px, transparent 1px, transparent 32px)',
        }}
      >
        {/* Logo */}
        <div className={`flex items-center gap-2.5 border-b border-black/5 px-5 py-5 ${collapsed ? 'justify-center px-3' : ''}`}>
          <LedgerMark size={30} />
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="truncate font-serif text-lg font-bold tracking-tight text-[#1F2A24]">
                EthioGenz
              </h1>
              <p className="text-[11px] font-medium text-[#1F2A24]/45">Smart Ledger</p>
            </div>
          )}
        </div>

        {/* User */}
        {user && (
          <div className={`border-b border-black/5 px-4 py-3.5 ${collapsed ? 'flex justify-center px-2' : ''}`}>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0F6B4C] text-xs font-semibold text-white">
                {initials(user.name)}
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-[#1F2A24]">{user.name}</p>
                  {user.businessName && (
                    <p className="flex items-center gap-1 truncate text-[11px] text-[#1F2A24]/50">
                      <Building2 size={11} /> {user.businessName}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Nav */}
        <nav ref={navRef} className="relative flex-1 space-y-1 overflow-y-auto p-3">
          <div
            className="pointer-events-none absolute left-3 right-3 rounded-lg bg-[#0F6B4C]/[0.08] transition-all duration-200 ease-out"
            style={{ top: indicator.top, height: indicator.height }}
          />
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            const count = badges?.[tab.id]
            return (
              <button
                key={tab.id}
                data-tab={tab.id}
                onClick={() => go(tab.id)}
                title={collapsed ? tab.label : undefined}
                className={`relative flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13.5px] font-medium transition-colors ${
                  collapsed ? 'justify-center px-0' : ''
                } ${isActive ? 'text-[#0F6B4C]' : 'text-[#1F2A24]/60 hover:text-[#1F2A24]'}`}
              >
                {isActive && !collapsed && (
                  <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-[#E5A823]" />
                )}
                <Icon size={19} strokeWidth={isActive ? 2.4 : 2} />
                {!collapsed && <span>{tab.label}</span>}
                {!collapsed && count ? <Badge count={count} /> : null}
                {collapsed && count ? (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#C1442E]" />
                ) : null}
              </button>
            )
          })}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="mx-3 mb-2 flex items-center justify-center gap-2 rounded-lg py-2 text-[11px] font-medium text-[#1F2A24]/40 transition hover:bg-black/[0.03] hover:text-[#1F2A24]/70"
        >
          {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
          {!collapsed && 'Collapse'}
        </button>

        {/* Logout */}
        <div className="border-t border-black/5 p-3">
          <button
            onClick={onLogout}
            title={collapsed ? 'Logout' : undefined}
            className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13.5px] font-medium text-[#C1442E] transition hover:bg-[#C1442E]/[0.08] ${
              collapsed ? 'justify-center px-0' : ''
            }`}
          >
            <LogOut size={19} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </div>
    )
  }

  // ---------- Mobile ----------
  return (
    <>
      <div className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between border-b border-black/5 bg-[#FBF9F5]/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex items-center gap-2">
          <LedgerMark size={26} />
          <h1 className="font-serif text-lg font-bold tracking-tight text-[#1F2A24]">EthioGenz</h1>
        </div>
        <button
          onClick={() => setIsSidebarOpen((o) => !o)}
          className="rounded-lg p-2 text-[#1F2A24]/70 hover:bg-black/5"
          aria-label={isSidebarOpen ? 'Close menu' : 'Open menu'}
        >
          {isSidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {isSidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
          <div className="fixed left-0 top-0 z-50 h-screen w-72 bg-[#FBF9F5] shadow-2xl md:hidden">
            <div className="flex items-center gap-2.5 border-b border-black/5 px-5 py-5">
              <LedgerMark size={30} />
              <div>
                <h1 className="font-serif text-lg font-bold tracking-tight text-[#1F2A24]">EthioGenz</h1>
                <p className="text-[11px] font-medium text-[#1F2A24]/45">Smart Ledger</p>
              </div>
            </div>

            {user && (
              <div className="border-b border-black/5 px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0F6B4C] text-xs font-semibold text-white">
                    {initials(user.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-[#1F2A24]">{user.name}</p>
                    {user.businessName && (
                      <p className="flex items-center gap-1 truncate text-[11px] text-[#1F2A24]/50">
                        <Building2 size={11} /> {user.businessName}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <nav className="flex-1 space-y-1 p-3">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                const count = badges?.[tab.id]
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      go(tab.id)
                      setIsSidebarOpen(false)
                    }}
                    className={`relative flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13.5px] font-medium transition-colors ${
                      isActive ? 'bg-[#0F6B4C]/[0.08] text-[#0F6B4C]' : 'text-[#1F2A24]/60 hover:bg-black/[0.03]'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-[#E5A823]" />
                    )}
                    <Icon size={19} strokeWidth={isActive ? 2.4 : 2} />
                    <span>{tab.label}</span>
                    {count ? <Badge count={count} /> : null}
                  </button>
                )
              })}
            </nav>

            <div className="border-t border-black/5 p-3">
              <button
                onClick={() => {
                  onLogout()
                  setIsSidebarOpen(false)
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13.5px] font-medium text-[#C1442E] hover:bg-[#C1442E]/[0.08]"
              >
                <LogOut size={19} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Bottom tab bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-black/5 bg-[#FBF9F5]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="flex items-stretch justify-around px-1 py-1.5">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            const count = badges?.[tab.id]
            return (
              <button
                key={tab.id}
                onClick={() => go(tab.id)}
                className="relative flex min-w-[52px] flex-col items-center gap-0.5 rounded-lg px-2 py-1"
              >
                <div
                  className={`relative rounded-lg p-1.5 transition-colors ${
                    isActive ? 'bg-[#0F6B4C]/[0.1]' : ''
                  }`}
                >
                  <Icon size={21} className={isActive ? 'text-[#0F6B4C]' : 'text-[#1F2A24]/45'} strokeWidth={isActive ? 2.4 : 2} />
                  {count ? (
                    <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#C1442E]" />
                  ) : null}
                </div>
                <span className={`text-[10px] font-medium ${isActive ? 'text-[#0F6B4C]' : 'text-[#1F2A24]/45'}`}>
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}