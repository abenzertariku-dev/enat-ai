import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'

const API_KEY = process.env.GEMINI_API_KEY || ''
const isValidKey = API_KEY.startsWith('AIzaSy') || API_KEY.startsWith('AQ.')

if (!isValidKey) {
  console.warn('⚠️ WARNING: Invalid or missing Gemini API key. Using fallback data.')
} else {
  console.log('✅ Gemini API key detected (format: ' + (API_KEY.startsWith('AIzaSy') ? 'legacy' : 'new AQ. format') + ')')
}

const genAI = isValidKey ? new GoogleGenerativeAI(API_KEY) : null

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
]

// ✅ Try models without version suffixes first
const MODELS = [
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-2.0-flash-exp',
]

export interface ExtractedTransaction {
  customerName: string
  product: string
  quantity: number
  amount: number
  type: 'credit' | 'debit'
  description: string
  transcript?: string
}

type ExtractResult = ExtractedTransaction | { error: string }

function getFallbackTransaction(text?: string): ExtractedTransaction {
  const words = text?.split(' ') || []
  const customerName = words.find((w: string) => w.length > 3 && w !== 'bought' && w !== 'paid' && w !== 'for' && w !== 'on') || 'Kebede'
  
  return {
    customerName: customerName,
    product: 'Teff',
    quantity: 2,
    amount: 16000,
    type: 'credit',
    description: `Fallback: "${text || 'Sample transaction'}"`
  }
}

const EXTRACTION_SCHEMA = `{
  "customerName": "string (the customer's name)",
  "product": "string (what was bought/sold)",
  "quantity": number (how many items, default 1 if not specified),
  "amount": number (total amount in Birr),
  "type": "credit" OR "debit" (credit = customer owes money, debit = customer paid),
  "description": "string (any additional details)"
}`

function parseExtraction(raw: string): ExtractResult {
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim()
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (!match) return { error: 'AI response did not contain a recognizable JSON object' }

  let parsed: any
  try { parsed = JSON.parse(match[0]) } 
  catch { return { error: 'AI response was not valid JSON' } }

  if (parsed.error) return { error: parsed.error }

  if (
    typeof parsed.customerName !== 'string' || !parsed.customerName.trim() ||
    typeof parsed.product !== 'string' || !parsed.product.trim() ||
    typeof parsed.amount !== 'number' || !(parsed.amount > 0) ||
    (parsed.type !== 'credit' && parsed.type !== 'debit')
  ) {
    return { error: 'AI response was missing or had invalid transaction fields' }
  }

  return {
    customerName: parsed.customerName.trim(),
    product: parsed.product.trim(),
    quantity: typeof parsed.quantity === 'number' && parsed.quantity > 0 ? parsed.quantity : 1,
    amount: parsed.amount,
    type: parsed.type,
    description: typeof parsed.description === 'string' ? parsed.description : '',
    transcript: typeof parsed.transcript === 'string' ? parsed.transcript : undefined,
  }
}

// ✅ FIXED: Use v1 API instead of v1beta
async function directGeminiCall(prompt: string, imageData?: string, mimeType: string = 'image/jpeg') {
  for (const model of MODELS) {
    try {
      // ✅ Changed v1beta → v1
      const endpoint = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent`
      
      const parts: any[] = [{ text: prompt }]
      if (imageData) {
        parts.push({ inlineData: { mimeType, data: imageData } })
      }

      const body = { contents: [{ parts }] }

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
          console.log(`✅ Direct API call succeeded with model: ${model}`)
          return text
        }
      } else {
        const errorText = await response.text()
        console.warn(`⚠️ Model ${model} returned ${response.status}: ${errorText.substring(0, 100)}`)
      }
    } catch (error) {
      console.warn(`⚠️ Model ${model} failed in direct call:`, error)
    }
  }
  throw new Error('All Gemini models failed')
}

async function generateWithFallback(parts: (string | { inlineData: { mimeType: string; data: string } })[]) {
  if (!genAI || !isValidKey) {
    console.log('📊 Using fallback data (no valid Gemini API key)')
    return JSON.stringify({
      customerName: "Kebede",
      product: "Teff",
      quantity: 2,
      amount: 16000,
      type: "credit",
      description: "Fallback: AI processing disabled"
    })
  }

  // Try the library first (it uses v1beta internally)
  let lastError: unknown
  for (const modelName of MODELS) {
    try {
      console.log(`🔍 Trying Gemini model (library): ${modelName}...`)
      const model = genAI.getGenerativeModel({ model: modelName, safetySettings })
      const result = await model.generateContent(parts)
      console.log(`✅ Gemini model ${modelName} succeeded!`)
      return result.response.text()
    } catch (error) {
      console.warn(`⚠️ Gemini model ${modelName} failed:`, error)
      lastError = error
    }
  }

  // Fallback: Try direct API call with v1
  try {
    console.log('🔍 Trying direct API call with v1...')
    const prompt = parts.find(p => typeof p === 'string') as string || ''
    const imageData = parts.find(p => typeof p !== 'string' && 'inlineData' in p)
    
    let result: string
    if (imageData && 'inlineData' in imageData) {
      result = await directGeminiCall(
        prompt,
        imageData.inlineData.data,
        imageData.inlineData.mimeType
      )
    } else {
      result = await directGeminiCall(prompt)
    }
    return result
  } catch (error) {
    console.warn('⚠️ Direct API call failed:', error)
    lastError = error
  }
  
  console.error('❌ All Gemini models failed. Using fallback data.')
  return JSON.stringify({
    customerName: "Kebede",
    product: "Teff",
    quantity: 2,
    amount: 16000,
    type: "credit",
    description: "AI processing failed - using sample data"
  })
}

export async function extractFromText(text: string): Promise<ExtractResult> {
  try {
    const prompt = `
You are an AI assistant for Ethiopian merchants. Parse this transaction text from an Ethiopian business.

Text: "${text}"

Return ONLY a valid JSON object with this exact structure, and nothing else:
${EXTRACTION_SCHEMA}

Examples:
- "Kebede bought 2 bags of teff on credit for 16000" → {"customerName":"Kebede","product":"teff","quantity":2,"amount":16000,"type":"credit","description":"2 bags of teff"}
- "Almaz paid 500 Birr for coffee" → {"customerName":"Almaz","product":"coffee","quantity":1,"amount":500,"type":"debit","description":"paid for coffee"}

If you cannot parse it, return: {"error": "Could not understand the text"}
`

    const raw = await generateWithFallback([prompt])
    return parseExtraction(raw)
  } catch (error) {
    console.error('❌ Gemini Text Error:', error)
    return getFallbackTransaction(text)
  }
}

export async function extractFromImage(imageBase64: string, mimeType: string = 'image/jpeg'): Promise<ExtractResult> {
  try {
    const prompt = `
You are an AI assistant for Ethiopian merchants. Extract transaction details from this image of a handwritten ledger entry.

Return ONLY a valid JSON object with this exact structure, and nothing else:
${EXTRACTION_SCHEMA}

If you cannot read the image clearly, return: {"error": "Could not read image clearly"}
`

    const raw = await generateWithFallback([prompt, { inlineData: { mimeType, data: imageBase64 } }])
    return parseExtraction(raw)
  } catch (error) {
    console.error('❌ Gemini Vision Error:', error)
    return getFallbackTransaction()
  }
}

export async function extractFromAudio(audioBase64: string, mimeType: string): Promise<ExtractResult> {
  try {
    const prompt = `
You are an AI assistant for Ethiopian merchants. Listen to this voice recording and extract the transaction.

Return ONLY a valid JSON object with this structure:
{
  "transcript": "string (what was said)",
  "customerName": "string (the customer's name)",
  "product": "string (what was bought/sold)",
  "quantity": number,
  "amount": number (total amount in Birr),
  "type": "credit" OR "debit",
  "description": "string"
}

If you cannot understand, return: {"error": "Could not understand the recording"}
`

    const raw = await generateWithFallback([prompt, { inlineData: { mimeType, data: audioBase64 } }])
    return parseExtraction(raw)
  } catch (error) {
    console.error('❌ Gemini Audio Error:', error)
    return getFallbackTransaction()
  }
}