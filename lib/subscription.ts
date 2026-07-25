export const TRIAL_DAYS = 30
export const PREMIUM_PRICE_ETB = 499
export const PREMIUM_MONTHS = 1

export type SubscriptionSnapshot = {
  plan: 'trial' | 'premium'
  subscriptionStatus: 'trialing' | 'active' | 'expired'
  trialEndsAt: string | null
  premiumUntil: string | null
  isActive: boolean
  daysLeft: number
  requiresUpgrade: boolean
  priceEtb: number
}

export function addMonths(date: Date, months: number) {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

export function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function trialEndFrom(start: Date = new Date()) {
  return addDays(start, TRIAL_DAYS)
}

export function getSubscriptionSnapshot(user: {
  plan?: string | null
  subscriptionStatus?: string | null
  trialEndsAt?: Date | string | null
  premiumUntil?: Date | string | null
}): SubscriptionSnapshot {
  const now = Date.now()
  const trialEndsAt = user.trialEndsAt ? new Date(user.trialEndsAt) : null
  const premiumUntil = user.premiumUntil ? new Date(user.premiumUntil) : null

  const premiumActive =
    user.plan === 'premium' &&
    !!premiumUntil &&
    premiumUntil.getTime() > now

  const trialActive =
    !premiumActive &&
    !!trialEndsAt &&
    trialEndsAt.getTime() > now &&
    (user.subscriptionStatus === 'trialing' || user.plan === 'trial')

  const isActive = premiumActive || trialActive

  let daysLeft = 0
  if (premiumActive && premiumUntil) {
    daysLeft = Math.max(0, Math.ceil((premiumUntil.getTime() - now) / (1000 * 60 * 60 * 24)))
  } else if (trialActive && trialEndsAt) {
    daysLeft = Math.max(0, Math.ceil((trialEndsAt.getTime() - now) / (1000 * 60 * 60 * 24)))
  }

  const plan: 'trial' | 'premium' = premiumActive ? 'premium' : 'trial'
  const subscriptionStatus: 'trialing' | 'active' | 'expired' = premiumActive
    ? 'active'
    : trialActive
      ? 'trialing'
      : 'expired'

  return {
    plan,
    subscriptionStatus,
    trialEndsAt: trialEndsAt?.toISOString() ?? null,
    premiumUntil: premiumUntil?.toISOString() ?? null,
    isActive,
    daysLeft,
    requiresUpgrade: !isActive,
    priceEtb: PREMIUM_PRICE_ETB,
  }
}

export function makeTxRef(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}
