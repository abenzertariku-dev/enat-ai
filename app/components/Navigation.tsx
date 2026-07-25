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
  BarChart3,
  Package,
} from 'lucide-react'
import BrandLogo from '@/app/components/BrandLogo'
import ThemeToggle from '@/app/components/ThemeToggle'
import LanguageToggle from '@/app/components/LanguageToggle'
import { useI18n } from '@/lib/i18n'

interface NavigationProps {
  activeTab: string
  onTabChange: (tab: string) => void
  user: {
    name: string
    businessName?: string | null
    phone?: string | null
  } | null
  onLogout: () => void
  badges?: Partial<Record<string, number>>
  onCollapsedChange?: (collapsed: boolean) => void
}

const TAB_IDS = [
  { id: 'dashboard', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { id: 'scan', icon: Scan, labelKey: 'nav.scan' },
  { id: 'voice', icon: Mic, labelKey: 'nav.voice' },
  { id: 'transactions', icon: Receipt, labelKey: 'nav.transactions' },
  { id: 'customers', icon: Users, labelKey: 'nav.customers' },
  { id: 'insights', icon: BarChart3, labelKey: 'nav.insights' },
  { id: 'stock', icon: Package, labelKey: 'nav.stock' },
  { id: 'settings', icon: Settings, labelKey: 'nav.settings' },
] as const

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

function BrandWordmark({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n()
  return (
    <div className="min-w-0">
      <h1 className="truncate text-lg font-bold tracking-tight text-[var(--enat-ink)]">
        <span className="text-[var(--enat-green)] dark:text-[#7dcea0]">ENAT</span>{' '}
        <span className="text-[#B88A44]">AI</span>
      </h1>
      {!compact && (
        <p className="text-[11px] font-medium text-[var(--muted)]">{t('nav.tagline')}</p>
      )}
    </div>
  )
}

export default function Navigation({
  activeTab,
  onTabChange,
  user,
  onLogout,
  badges,
  onCollapsedChange,
}: NavigationProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const router = useRouter()
  const navRef = useRef<HTMLDivElement>(null)
  const [indicator, setIndicator] = useState({ top: 0, height: 0 })
  const { t } = useI18n()

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

  useEffect(() => {
    if (!navRef.current) return
    const el = navRef.current.querySelector<HTMLElement>(`[data-tab="${activeTab}"]`)
    if (el) {
      setIndicator({ top: el.offsetTop, height: el.offsetHeight })
    }
  }, [activeTab, collapsed, isMobile])

  const go = (id: string) => {
    onTabChange(id)
    router.push(`/dashboard#${id}`)
  }

  if (!isMobile) {
    return (
      <div
        className={`fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-[var(--border)] bg-[var(--surface-muted)] transition-[width] duration-300 ease-out ${
          collapsed ? 'w-[76px]' : 'w-64'
        }`}
      >
        <div
          className={`flex items-center gap-2.5 border-b border-[var(--border)] px-5 py-5 ${
            collapsed ? 'justify-center px-3' : ''
          }`}
        >
          <BrandLogo size={34} />
          {!collapsed && <BrandWordmark />}
        </div>

        {user && (
          <div
            className={`border-b border-[var(--border)] px-4 py-3.5 ${
              collapsed ? 'flex justify-center px-2' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--enat-green-mid)] text-xs font-semibold text-white">
                {initials(user.name)}
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-[var(--enat-ink)]">{user.name}</p>
                  {user.businessName && (
                    <p className="flex items-center gap-1 truncate text-[11px] text-[var(--muted)]">
                      <Building2 size={11} /> {user.businessName}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <nav ref={navRef} className="relative flex-1 space-y-1 overflow-y-auto p-3">
          <div
            className="pointer-events-none absolute left-3 right-3 rounded-lg bg-[var(--enat-green-mid)]/10 transition-all duration-200 ease-out"
            style={{ top: indicator.top, height: indicator.height }}
          />
          {TAB_IDS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            const label = t(tab.labelKey)
            const count = badges?.[tab.id]
            return (
              <button
                key={tab.id}
                data-tab={tab.id}
                onClick={() => go(tab.id)}
                title={collapsed ? label : undefined}
                className={`relative flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13.5px] font-medium transition-colors ${
                  collapsed ? 'justify-center px-0' : ''
                } ${
                  isActive
                    ? 'text-[var(--enat-green-mid)]'
                    : 'text-[var(--muted)] hover:text-[var(--enat-ink)]'
                }`}
              >
                {isActive && !collapsed && (
                  <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-[#B88A44]" />
                )}
                <Icon size={19} strokeWidth={isActive ? 2.4 : 2} />
                {!collapsed && <span>{label}</span>}
                {!collapsed && count ? <Badge count={count} /> : null}
                {collapsed && count ? (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#C1442E]" />
                ) : null}
              </button>
            )
          })}
        </nav>

        {!collapsed && (
          <div className="mx-3 mb-2 flex items-center gap-2">
            <LanguageToggle className="border-[var(--border)] bg-[var(--surface)] text-[var(--enat-ink)]" />
            <ThemeToggle className="border-[var(--border)] bg-[var(--surface)] text-[var(--enat-ink)]" />
          </div>
        )}

        <button
          onClick={() => setCollapsed((c) => !c)}
          className="mx-3 mb-2 flex items-center justify-center gap-2 rounded-lg py-2 text-[11px] font-medium text-[var(--muted)] transition hover:bg-black/[0.03] hover:text-[var(--enat-ink)] dark:hover:bg-white/[0.05]"
        >
          {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
          {!collapsed && t('nav.collapse')}
        </button>

        <div className="border-t border-[var(--border)] p-3">
          <button
            onClick={onLogout}
            title={collapsed ? t('nav.logout') : undefined}
            className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13.5px] font-medium text-[#C1442E] transition hover:bg-[#C1442E]/[0.08] ${
              collapsed ? 'justify-center px-0' : ''
            }`}
          >
            <LogOut size={19} />
            {!collapsed && <span>{t('nav.logout')}</span>}
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-muted)]/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex items-center gap-2">
          <BrandLogo size={28} />
          <h1 className="text-lg font-bold tracking-tight">
            <span className="text-[var(--enat-green)] dark:text-[#7dcea0]">ENAT</span>{' '}
            <span className="text-[#B88A44]">AI</span>
          </h1>
        </div>
        <div className="flex items-center gap-1.5">
          <LanguageToggle className="border-[var(--border)] bg-[var(--surface)] text-[var(--enat-ink)]" />
          <ThemeToggle className="border-[var(--border)] bg-[var(--surface)] text-[var(--enat-ink)]" />
          <button
            onClick={() => setIsSidebarOpen((o) => !o)}
            className="rounded-lg p-2 text-[var(--enat-ink)] hover:bg-black/5 dark:hover:bg-white/5"
            aria-label={isSidebarOpen ? 'Close menu' : 'Open menu'}
          >
            {isSidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {isSidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
          <div className="fixed left-0 top-0 z-50 h-screen w-72 bg-[var(--surface-muted)] shadow-2xl md:hidden">
            <div className="flex items-center gap-2.5 border-b border-[var(--border)] px-5 py-5">
              <BrandLogo size={34} />
              <BrandWordmark />
            </div>

            {user && (
              <div className="border-b border-[var(--border)] px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--enat-green-mid)] text-xs font-semibold text-white">
                    {initials(user.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-[var(--enat-ink)]">{user.name}</p>
                    {user.businessName && (
                      <p className="flex items-center gap-1 truncate text-[11px] text-[var(--muted)]">
                        <Building2 size={11} /> {user.businessName}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <nav className="flex-1 space-y-1 p-3">
              {TAB_IDS.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                const label = t(tab.labelKey)
                const count = badges?.[tab.id]
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      go(tab.id)
                      setIsSidebarOpen(false)
                    }}
                    className={`relative flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13.5px] font-medium transition-colors ${
                      isActive
                        ? 'bg-[var(--enat-green-mid)]/10 text-[var(--enat-green-mid)]'
                        : 'text-[var(--muted)] hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-[#B88A44]" />
                    )}
                    <Icon size={19} strokeWidth={isActive ? 2.4 : 2} />
                    <span>{label}</span>
                    {count ? <Badge count={count} /> : null}
                  </button>
                )
              })}
            </nav>

            <div className="border-t border-[var(--border)] p-3">
              <button
                onClick={() => {
                  onLogout()
                  setIsSidebarOpen(false)
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13.5px] font-medium text-[#C1442E] hover:bg-[#C1442E]/[0.08]"
              >
                <LogOut size={19} />
                <span>{t('nav.logout')}</span>
              </button>
            </div>
          </div>
        </>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--border)] bg-[var(--surface-muted)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="flex items-stretch justify-around px-1 py-1.5">
          {TAB_IDS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            const label = t(tab.labelKey)
            const count = badges?.[tab.id]
            return (
              <button
                key={tab.id}
                onClick={() => go(tab.id)}
                className="relative flex min-w-[52px] flex-col items-center gap-0.5 rounded-lg px-2 py-1"
              >
                <div
                  className={`relative rounded-lg p-1.5 transition-colors ${
                    isActive ? 'bg-[var(--enat-green-mid)]/10' : ''
                  }`}
                >
                  <Icon
                    size={21}
                    className={isActive ? 'text-[var(--enat-green-mid)]' : 'text-[var(--muted)]'}
                    strokeWidth={isActive ? 2.4 : 2}
                  />
                  {count ? (
                    <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#C1442E]" />
                  ) : null}
                </div>
                <span
                  className={`text-[10px] font-medium ${
                    isActive ? 'text-[var(--enat-green-mid)]' : 'text-[var(--muted)]'
                  }`}
                >
                  {label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
