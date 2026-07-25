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

// ─── Helper: Get Business Type Label ──────────────────────────────────

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
    const { transactions, stats, topProducts, avgTransaction } = await req.json()

    // ─── Build Personalized Prompt ─────────────────────────────────────
    // ✅ FIXED: Pass the values safely with null checking
    const businessTypeLabel = getBusinessTypeLabel(user?.businessType)
    const challengeLabel = getChallengeLabel(user?.challenge)
    const teamSizeLabel = getTeamSizeLabel(user?.teamSize)
    const businessName = user?.businessName || user?.name || 'Business Owner'
    const location = user?.location || 'Ethiopia'

    const prompt = `
You are a business intelligence analyst for an Ethiopian merchant. Analyze the following business data and provide 4 actionable insights.

BUSINESS PROFILE:
- Business: ${businessName}
- Type: ${businessTypeLabel}
- Location: ${location}
- Team Size: ${teamSizeLabel}
- Main Challenge: ${challengeLabel}

BUSINESS STATS:
- Total Revenue: ${stats.totalSales} Birr
- Outstanding Debt: ${stats.totalDebt} Birr
- Total Transactions: ${stats.totalTransactions}
- Active Customers: ${stats.outstandingCustomers}
- Average Transaction: ${avgTransaction} Birr

TOP PRODUCTS:
${topProducts.map((p: any, i: number) => `${i + 1}. ${p.name}: ${p.revenue} Birr (${p.count} sales)`).join('\n')}

Recent Transactions: ${transactions.length} transactions

TASK:
Based on the business profile and data, provide 4 specific, actionable insights that help this business grow. Each insight should:
1. Be specific to their business type (${businessTypeLabel})
2. Address their main challenge (${challengeLabel})
3. Be practical for their team size (${teamSizeLabel})
4. Start with an emoji

Focus areas:
1. Revenue opportunities specific to their business type
2. Debt collection and cash flow management
3. Customer behavior and retention
4. Business growth and operations

Return ONLY a JSON array of strings.
Example: ["💡 Insight 1", "📈 Insight 2", "🎯 Insight 3", "⭐ Insight 4"]
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

    // ─── Personalized Fallback Insights ──────────────────────────────

    if (!insights || insights.length === 0) {
      // Generate fallback insights based on business type and challenge
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
          '📊 Use EthioGenz reports to identify your top 5 most profitable products and focus on them.'
        ],
        'stock': [
          '📦 Use inventory tracking in EthioGenz to get alerts when stock levels are low.',
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
          '💳 Set clear credit terms and use EthioGenz to track and follow up on unpaid debts.',
          '📱 Send automated reminders to customers with outstanding balances.'
        ],
        'competition': [
          '🏪 Differentiate your business by offering unique products or better customer service.',
          '⭐ Focus on quality and consistency to build a loyal customer base.'
        ],
        'technology': [
          '💻 EthioGenz automates your bookkeeping so you can focus on growing your business.',
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
          '📊 EthioGenz automatically generates reports so you always know your financial position.',
          '📈 Review your reports weekly to spot trends and opportunities.'
        ],
      }

      // Build fallback insights
      const typeKey = user?.businessType || ''
      const typeInsight = typeInsights[typeKey] || 
        `💡 Your ${businessTypeLabel} could benefit from focusing on your best-selling items and customer service.`
      
      fallbacks.push(typeInsight)

      // Add challenge-based insights
      const challengeKey = user?.challenge || ''
      if (challengeKey && challengeInsights[challengeKey]) {
        const challengeList = challengeInsights[challengeKey]
        if (challengeList.length >= 2) {
          fallbacks.push(challengeList[0])
          fallbacks.push(challengeList[1])
        }
      } else {
        fallbacks.push('📊 Use EthioGenz insights to track your best-selling products and focus on them.')
        fallbacks.push('🎯 Set weekly goals and track your progress using the dashboard.')
      }

      // Add location-based insight
      fallbacks.push(`📍 Your location in ${location} is an advantage. Focus on local marketing and community engagement.`)

      // Ensure we have exactly 4 insights
      while (fallbacks.length < 4) {
        fallbacks.push('🌟 Focus on customer satisfaction and building relationships for long-term success.')
      }

      insights = fallbacks.slice(0, 4)
    }

    // ─── Add a personalized greeting insight ───────────────────────────
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
      greeting
    })
  } catch (error) {
    console.error('AI Insights Error:', error)
    return NextResponse.json({
      insights: [
        '💡 Focus on your top performing products to maximize revenue.',
        '📈 Follow up with customers who have outstanding balances.',
        '🎯 Engage with your most valuable customers regularly.',
        '⭐ Keep tracking your business metrics to identify opportunities.'
      ],
      personalized: false
    })
  }
}