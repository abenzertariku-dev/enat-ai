'use client'

import { ThemeProvider } from '@/lib/theme'
import { I18nProvider } from '@/lib/i18n'

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider>{children}</I18nProvider>
    </ThemeProvider>
  )
}
