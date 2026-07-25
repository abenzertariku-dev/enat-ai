import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

const API_KEY = process.env.GEMINI_API_KEY || ''

function getUserId(req: NextRequest): string | null {
  try {
    const token = req.headers.get('authorization')?.split(' ')[1]
    if (!token) return null
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
    return decoded.userId
  } catch {
    return null
  }
}

async function callGeminiAPI(prompt: string) {
  const modelNames = ['gemini-3.5-flash', 'gemini-3.1-flash-lite']

  for (const model of modelNames) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
      const body = { contents: [{ parts: [{ text: prompt }] }] }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'x-goog-api-key': API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        const data = await response.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) return text
      }
    } catch (error) {
      console.warn(`⚠️ Model ${model} failed:`, error)
    }
  }
  return null
}

// ─── Helper Functions ──────────────────────────────────────────────────

function getBusinessTypeLabel(type: string | null | undefined): string {
  const labels: Record<string, string> = {
    'coffee-shop': 'Coffee Shop',
    'restaurant': 'Restaurant',
    'shop': 'Shop / Retail',
    'teff-seller': 'Teff / Grain Seller',
    'kiosk': 'Kiosk / Convenience Store',
    'grocery': 'Grocery Store',
    'bakery': 'Bakery',
    'butcher': 'Butcher / Meat Shop',
    'vegetable': 'Vegetable / Fruit Seller',
    'clothing': 'Clothing / Fashion Shop',
    'electronics': 'Electronics / Mobile Shop',
    'hardware': 'Hardware / Construction',
    'pharmacy': 'Pharmacy / Drug Store',
    'salon': 'Salon / Barber',
    'tailor': 'Tailor / Sewing',
    'transport': 'Transport / Logistics',
    'wholesale': 'Wholesale Distributor',
    'manufacturing': 'Small Manufacturing',
    'farm': 'Farm / Agriculture',
    'other': 'Other Business',
  }
  if (!type) return 'Small Business'
  return labels[type] || type
}

function getChallengeLabel(challenge: string | null | undefined): string {
  const labels: Record<string, string> = {
    'stock': 'Running out of stock unexpectedly',
    'money': 'Not knowing where money goes',
    'sales': 'Sales are not growing',
    'staff': 'Managing staff and shifts',
    'suppliers': 'Finding reliable suppliers',
    'reports': 'Doing reports and tracking finances',
    'customers': 'Finding and keeping customers',
    'pricing': 'Setting the right prices',
    'competition': 'Competition from other businesses',
    'technology': 'Learning new technology',
    'credit': 'Managing customer credit/debt',
    'other': 'Other challenges',
  }
  if (!challenge) return 'Business challenges'
  return labels[challenge] || challenge
}

function getTeamSizeLabel(size: string | null | undefined): string {
  const labels: Record<string, string> = {
    'solo': 'Solo (Just me)',
    '2-5': '2-5 people',
    '6-10': '6-10 people',
    '11-20': '11-20 people',
    '21-30': '21-30 people',
    '30+': 'More than 30 people',
    'other': 'Other team size',
  }
  if (!size) return 'Small team'
  return labels[size] || size
}

// ─── Calculate Additional Metrics ─────────────────────────────────────

function calculateMetrics(transactions: any[], stats: any) {
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0)
  const collectionRate = totalAmount > 0 ? (stats.totalSales / totalAmount) * 100 : 0
  
  // Customer analysis
  const customerMap = new Map<string, { totalSpent: number; count: number }>()
  transactions.forEach(t => {
    const name = t.customer?.name || 'Unknown'
    if (!customerMap.has(name)) {
      customerMap.set(name, { totalSpent: 0, count: 0 })
    }
    const c = customerMap.get(name)!
    c.totalSpent += t.amount
    c.count += 1
  })
  
  const topCustomers = Array.from(customerMap.entries())
    .map(([name, data]) => ({ name, totalSpent: data.totalSpent, count: data.count }))
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 5)

  // Product analysis
  const productMap = new Map<string, { revenue: number; count: number }>()
  transactions.forEach(t => {
    if (!productMap.has(t.product)) {
      productMap.set(t.product, { revenue: 0, count: 0 })
    }
    const p = productMap.get(t.product)!
    p.revenue += t.amount
    p.count += 1
  })
  
  const topProducts = Array.from(productMap.entries())
    .map(([name, data]) => ({ name, revenue: data.revenue, count: data.count }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  // Source distribution
  const sourceMap = new Map<string, number>()
  transactions.forEach(t => {
    const source = t.source || 'unknown'
    sourceMap.set(source, (sourceMap.get(source) || 0) + 1)
  })

  // Monthly trend
  const monthlyData = [...Array(12)].map((_, i) => {
    const month = new Date()
    month.setMonth(month.getMonth() - i)
    const monthTransactions = transactions.filter(t => {
      const txDate = new Date(t.date)
      return txDate.getMonth() === month.getMonth() && txDate.getFullYear() === month.getFullYear()
    })
    return {
      month: month.toLocaleDateString('en-US', { month: 'short' }),
      sales: monthTransactions.filter(t => t.status === 'paid').reduce((sum, t) => sum + t.amount, 0),
      debt: monthTransactions.filter(t => t.status === 'unpaid').reduce((sum, t) => sum + t.amount, 0),
      count: monthTransactions.length
    }
  }).reverse()

  return {
    collectionRate,
    topCustomers,
    topProducts,
    sourceDistribution: Array.from(sourceMap.entries()).map(([name, value]) => ({ name, value })),
    monthlyData,
    avgTransaction: transactions.length > 0 ? totalAmount / transactions.length : 0,
    uniqueCustomers: customerMap.size
  }
}

// ─── MAIN POST HANDLER ─────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const userId = getUserId(req)
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // ─── Get User Profile Data ─────────────────────────────────────────
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        businessType: true,
        teamSize: true,
        location: true,
        challenge: true,
        businessName: true,
        name: true,
      },
    })

    // ─── Get Request Data ─────────────────────────────────────────────
    const { transactions, stats, topProducts: reqTopProducts, avgTransaction: reqAvgTransaction } = await req.json()

    // ─── Calculate Advanced Metrics ────────────────────────────────────
    const metrics = calculateMetrics(transactions, stats)

    // ─── Build Enhanced Prompt ─────────────────────────────────────────
    const businessTypeLabel = getBusinessTypeLabel(user?.businessType)
    const challengeLabel = getChallengeLabel(user?.challenge)
    const teamSizeLabel = getTeamSizeLabel(user?.teamSize)
    const businessName = user?.businessName || user?.name || 'Business Owner'
    const location = user?.location || 'Ethiopia'

    const prompt = `
You are a senior business intelligence analyst for an Ethiopian merchant. Analyze the following business data and provide 5 actionable insights.

BUSINESS PROFILE:
- Business: ${businessName}
- Type: ${businessTypeLabel}
- Location: ${location}
- Team Size: ${teamSizeLabel}
- Main Challenge: ${challengeLabel}

KEY METRICS:
- Total Revenue: ${stats.totalSales} Birr
- Outstanding Debt: ${stats.totalDebt} Birr
- Collection Rate: ${Math.round(metrics.collectionRate)}%
- Total Transactions: ${stats.totalTransactions}
- Active Customers: ${stats.outstandingCustomers}
- Unique Customers: ${metrics.uniqueCustomers}
- Average Transaction: ${reqAvgTransaction || metrics.avgTransaction} Birr

TOP PRODUCTS:
${(reqTopProducts || metrics.topProducts).map((p: any, i: number) => `${i + 1}. ${p.name}: ${p.revenue} Birr (${p.count} sales)`).join('\n')}

TOP CUSTOMERS:
${metrics.topCustomers.map((c: any, i: number) => `${i + 1}. ${c.name}: ${c.totalSpent} Birr (${c.count} transactions)`).join('\n')}

SOURCE DISTRIBUTION:
${metrics.sourceDistribution.map((s: any) => `- ${s.name}: ${s.value} transactions`).join('\n')}

TASK:
Based on the business profile and data, provide 5 specific, actionable insights that help this business grow. Each insight should:
1. Be specific to their business type (${businessTypeLabel})
2. Address their main challenge (${challengeLabel})
3. Be practical for their team size (${teamSizeLabel})
4. Start with a relevant emoji

Focus areas:
1. Revenue opportunities specific to their business type
2. Debt collection and cash flow management
3. Customer behavior and retention
4. Business growth and operations
5. Inventory/stock management (if applicable)

Return ONLY a JSON array of 5 strings.
Example: ["💡 Insight 1", "📈 Insight 2", "🎯 Insight 3", "⭐ Insight 4", "📦 Insight 5"]
`

    const result = await callGeminiAPI(prompt)

    let insights: string[] = []
    if (result) {
      try {
        const cleaned = result.replace(/```json/g, '').replace(/```/g, '').trim()
        insights = JSON.parse(cleaned)
      } catch {
        // Fallback
      }
    }

    // ─── Enhanced Fallback Insights ──────────────────────────────────

    if (!insights || insights.length === 0) {
      const fallbacks: string[] = []

      // Revenue insight based on business type
      const typeInsights: Record<string, string> = {
        'coffee-shop': '☕ Your coffee shop could increase revenue by offering combo deals or loyalty cards for regular customers.',
        'restaurant': '🍽️ Consider introducing a daily special menu to attract more customers and increase average order value.',
        'teff-seller': '🌾 Expand your teff offerings by adding different grades or packaging sizes to attract more buyers.',
        'shop': '🛍️ Your shop could benefit from bundling complementary products to increase average transaction value.',
        'kiosk': '🏪 Stock high-demand items and consider extending your operating hours to capture more sales.',
        'grocery': '🛒 Grocery stores can increase revenue by adding fresh produce or ready-to-eat items.',
        'bakery': '🥖 Your bakery could offer custom cakes or bread subscriptions to generate recurring revenue.',
        'clothing': '👕 Consider seasonal promotions and loyalty programs to encourage repeat customers.',
        'electronics': '📱 Offer repair services or extended warranties to increase customer lifetime value.',
        'pharmacy': '💊 Build customer loyalty through health consultations and personalized recommendations.',
        'hardware': '🔧 Hardware shops can increase revenue by offering delivery and installation services.',
        'salon': '💇 Offer package deals (hair + nails + massage) to increase average transaction value.',
        'tailor': '🧵 Tailor shops can increase revenue by offering custom design services or alteration packages.',
      }

      // Challenge-based insights
      const challengeInsights: Record<string, string[]> = {
        'money': [
          '💰 Track your daily expenses and income separately to understand exactly where your money goes.',
          '📊 Use ENAT AI reports to identify your top 5 most profitable products and focus on them.'
        ],
        'stock': [
          '📦 Use inventory tracking in ENAT AI to get alerts when stock levels are low.',
          '📈 Analyze your sales trends to predict what items you need to restock and when.'
        ],
        'sales': [
          '📉 Promote your top-selling products and cross-sell complementary items to increase sales.',
          '🏷️ Run a referral program where existing customers bring in new ones for a discount.'
        ],
        'staff': [
          '👥 Consider cross-training staff to cover multiple roles during busy periods.',
          '📋 Use shift scheduling to ensure you have enough staff during peak hours.'
        ],
        'suppliers': [
          '🔗 Build relationships with multiple suppliers to avoid stock shortages.',
          '🤝 Negotiate bulk discounts with your existing suppliers to improve margins.'
        ],
        'credit': [
          '💳 Set clear credit terms and use ENAT AI to track and follow up on unpaid debts.',
          '📱 Send automated reminders to customers with outstanding balances.'
        ],
        'competition': [
          '🏪 Differentiate your business by offering unique products or better customer service.',
          '⭐ Focus on quality and consistency to build a loyal customer base.'
        ],
        'technology': [
          '💻 ENAT AI automates your bookkeeping so you can focus on growing your business.',
          '📱 Use the mobile app to track transactions on the go.'
        ],
        'customers': [
          '👤 Engage with your customers regularly through personalized promotions.',
          '⭐ Build a loyalty program that rewards repeat customers.'
        ],
        'pricing': [
          '🏷️ Regularly review your prices to ensure you are competitive while maintaining profit margins.',
          '📊 Offer volume discounts to encourage larger purchases.'
        ],
        'reports': [
          '📊 ENAT AI automatically generates reports so you always know your financial position.',
          '📈 Review your reports weekly to spot trends and opportunities.'
        ],
      }

      const typeKey = user?.businessType || ''
      const typeInsight = typeInsights[typeKey] || 
        `💡 Your ${businessTypeLabel} could benefit from focusing on your best-selling items and customer service.`
      fallbacks.push(typeInsight)

      const challengeKey = user?.challenge || ''
      if (challengeKey && challengeInsights[challengeKey]) {
        const challengeList = challengeInsights[challengeKey]
        if (challengeList.length >= 2) {
          fallbacks.push(challengeList[0])
          fallbacks.push(challengeList[1])
        }
      } else {
        fallbacks.push('📊 Use ENAT AI insights to track your best-selling products and focus on them.')
        fallbacks.push('🎯 Set weekly goals and track your progress using the dashboard.')
      }

      fallbacks.push(`📍 Your location in ${location} is an advantage. Focus on local marketing and community engagement.`)

      // Add a 5th insight based on collection rate
      if (metrics.collectionRate < 70) {
        fallbacks.push('📈 Your collection rate is below 70%. Focus on following up with customers who have outstanding balances.')
      } else if (metrics.collectionRate > 90) {
        fallbacks.push('⭐ Excellent collection rate! Consider offering early payment discounts to maintain this momentum.')
      } else {
        fallbacks.push('🌟 Focus on customer satisfaction and building relationships for long-term success.')
      }

      insights = fallbacks.slice(0, 5)
    }

    // ─── Ensure 5 Insights ────────────────────────────────────────────
    while (insights.length < 5) {
      insights.push('🌟 Focus on customer satisfaction and building relationships for long-term success.')
    }

    // ─── Greeting ──────────────────────────────────────────────────────
    const greeting = `👋 ${user?.name || 'Hello'}, here are your personalized business insights based on your ${businessTypeLabel} business in ${location}.`

    return NextResponse.json({
      insights,
      personalized: true,
      businessProfile: {
        type: businessTypeLabel,
        teamSize: teamSizeLabel,
        location: location,
        challenge: challengeLabel,
      },
      greeting,
      metrics: {
        collectionRate: Math.round(metrics.collectionRate),
        uniqueCustomers: metrics.uniqueCustomers,
        topCustomers: metrics.topCustomers.slice(0, 3),
        sourceDistribution: metrics.sourceDistribution,
      }
    })
  } catch (error) {
    console.error('AI Insights Error:', error)
    return NextResponse.json({
      insights: [
        '💡 Focus on your top performing products to maximize revenue.',
        '📈 Follow up with customers who have outstanding balances.',
        '🎯 Engage with your most valuable customers regularly.',
        '⭐ Keep tracking your business metrics to identify opportunities.',
        '📦 Monitor your inventory levels to avoid stockouts.'
      ],
      personalized: false
    })
  }
}