import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

// ✅ Use the same API key and model as your main app
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

// ✅ Direct REST API call (same as your working gemini.ts)
async function callGeminiAPI(prompt: string) {
  const modelNames = [
    'gemini-3.5-flash',      // ✅ Working model from your app
    'gemini-3.1-flash-lite', // ✅ Working model from your app
  ]

  for (const model of modelNames) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
      
      const body = {
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ]
      }

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
        if (text) {
          console.log(`✅ Debt Guardian: Model ${model} succeeded!`)
          return text
        }
      }
    } catch (error) {
      console.warn(`⚠️ Debt Guardian: Model ${model} failed:`, error)
    }
  }

  console.error('❌ Debt Guardian: All models failed')
  return null
}

export async function GET(req: NextRequest) {
  try {
    const userId = getUserId(req)
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const customerId = searchParams.get('customerId')

    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID required' }, { status: 400 })
    }

    // Get customer with debt history
    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        userId: userId,
        totalDebt: { gt: 0 }
      },
      include: {
        transactions: {
          where: { status: 'unpaid' },
          orderBy: { date: 'asc' }
        }
      }
    })

    if (!customer) {
      return NextResponse.json({ error: 'No debt found for this customer' }, { status: 404 })
    }

    // Calculate debt age
    const oldestDebt = customer.transactions[0]
    const daysOverdue = oldestDebt 
      ? Math.floor((Date.now() - new Date(oldestDebt.date).getTime()) / (1000 * 60 * 60 * 24)) 
      : 0

    // ✅ Generate AI insights using the working model
    const ai = await generateDebtInsights(customer, daysOverdue)

    return NextResponse.json({
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        totalDebt: customer.totalDebt,
      },
      debtSummary: {
        totalUnpaid: customer.transactions.length,
        oldestDebt: oldestDebt?.date,
        daysOverdue,
        riskLevel: daysOverdue > 90 ? 'high' : daysOverdue > 30 ? 'medium' : 'low',
      },
      ai: ai,
    })
  } catch (error) {
    console.error('Debt Guardian Error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

async function generateDebtInsights(customer: any, daysOverdue: number) {
  const prompt = `
You are a debt collection assistant for an Ethiopian merchant. Analyze this customer's debt:

Customer: ${customer.name}
Total Debt: ${customer.totalDebt} Birr
Days Overdue: ${daysOverdue}
Number of Unpaid Transactions: ${customer.transactions.length}

Tasks:
1. Generate a friendly reminder message in Amharic and English
2. Generate a professional reminder message in Amharic and English
3. Recommend the best action (SMS, Call, Payment Plan, Legal Follow-up)

Return ONLY valid JSON:
{
  "friendlyMessage": {
    "amharic": "string",
    "english": "string"
  },
  "professionalMessage": {
    "amharic": "string", 
    "english": "string"
  },
  "recommendation": {
    "action": "SMS | Call | Payment Plan | Legal Follow-up",
    "priority": "high | medium | low",
    "reason": "string"
  },
  "riskAssessment": "string"
}
`

  try {
    const result = await callGeminiAPI(prompt)
    if (!result) {
      throw new Error('AI returned no result')
    }
    const cleaned = result.replace(/```json/g, '').replace(/```/g, '').trim()
    return JSON.parse(cleaned)
  } catch (error) {
    console.error('AI Insight Error:', error)
    
    // ✅ Return fallback data when AI fails
    return {
      friendlyMessage: {
        amharic: `ክቡር ${customer.name}፣ የ${customer.totalDebt} ብር ዕዳዎ እንዲከፈል በአክብሮት እናሳስባለን። እባክዎን በቅርቡ ይክፈሉ።`,
        english: `Dear ${customer.name}, kindly pay your ${customer.totalDebt} Birr debt. Thank you.`
      },
      professionalMessage: {
        amharic: `ለ${customer.name}፣ የ${customer.totalDebt} ብር ዕዳዎ ከ${daysOverdue} ቀናት በላይ ሆኗል። እባክዎን ቶሎ ይክፈሉ። ለተጨማሪ መረጃ ይደውሉልን።`,
        english: `To ${customer.name}, your ${customer.totalDebt} Birr debt is ${daysOverdue} days overdue. Please pay immediately.`
      },
      recommendation: {
        action: daysOverdue > 60 ? 'Call' : 'SMS',
        priority: daysOverdue > 90 ? 'high' : daysOverdue > 30 ? 'medium' : 'low',
        reason: `Debt is ${daysOverdue} days old`
      },
      riskAssessment: `${customer.name} has ${customer.transactions.length} unpaid transactions totaling ${customer.totalDebt} Birr.`
    }
  }
}