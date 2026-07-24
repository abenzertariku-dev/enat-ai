import { NextRequest, NextResponse } from 'next/server'
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

export async function POST(req: NextRequest) {
  try {
    const userId = getUserId(req)
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { transactions, stats, topProducts, avgTransaction } = await req.json()

    const prompt = `
You are a business intelligence analyst for an Ethiopian merchant. Analyze the following business data and provide 4 actionable insights.

Business Stats:
- Total Revenue: ${stats.totalSales} Birr
- Outstanding Debt: ${stats.totalDebt} Birr
- Total Transactions: ${stats.totalTransactions}
- Active Customers: ${stats.outstandingCustomers}
- Average Transaction: ${avgTransaction} Birr

Top Products:
${topProducts.map((p: any, i: number) => `${i + 1}. ${p.name}: ${p.revenue} Birr (${p.count} sales)`).join('\n')}

Recent Transactions: ${transactions.length} transactions

Provide 4 specific, actionable insights that help this business grow. Each insight should be a single sentence starting with an emoji. Focus on:
1. Revenue opportunities
2. Debt collection
3. Customer behavior
4. Business growth

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

    // Fallback insights if AI fails
    if (!insights || insights.length === 0) {
      insights = [
        '💡 Your top product is driving the most revenue. Consider promoting it more.',
        '📈 You have outstanding debt. Send reminders to improve cash flow.',
        '🎯 Your customers are making multiple purchases. Build loyalty programs.',
        '⭐ Your business is growing steadily. Keep up the momentum!'
      ]
    }

    return NextResponse.json({ insights })
  } catch (error) {
    console.error('AI Insights Error:', error)
    return NextResponse.json({
      insights: [
        '💡 Focus on your top performing products to maximize revenue.',
        '📈 Follow up with customers who have outstanding balances.',
        '🎯 Engage with your most valuable customers regularly.',
        '⭐ Keep tracking your business metrics to identify opportunities.'
      ]
    })
  }
}