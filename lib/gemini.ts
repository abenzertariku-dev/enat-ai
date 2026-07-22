import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

if (!process.env.GEMINI_API_KEY) {
  console.warn('GEMINI_API_KEY is not set — Gemini calls will fail.')
}

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
]

// Current, supported models as of mid-2026. gemini-1.5-pro / gemini-1.0-pro / gemini-2.0-flash-exp
// have all been shut down by Google and will 404 — don't add them back.
const MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite']

export interface ExtractedTransaction {
  customerName: string
  product: string
  quantity: number
  amount: number
  type: 'credit' | 'debit'
  description: string
  /** Present only for audio extraction — what Gemini heard, in the language it was spoken. */
  transcript?: string
}

type ExtractResult = ExtractedTransaction | { error: string }

const EXTRACTION_SCHEMA = `{
  "customerName": "string (the customer's name)",
  "product": "string (what was bought/sold)",
  "quantity": number (how many items, default 1 if not specified),
  "amount": number (total amount in Birr),
  "type": "credit" OR "debit" (credit = customer owes money, debit = customer paid),
  "description": "string (any additional details)"
}`

/** Parses and sanity-checks Gemini's JSON response. Never throws — always returns a result or an error. */
function parseExtraction(raw: string): ExtractResult {
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim()

  // Gemini occasionally wraps JSON in prose despite instructions — pull out the object itself.
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (!match) {
    return { error: 'AI response did not contain a recognizable JSON object' }
  }

  let parsed: any
  try {
    parsed = JSON.parse(match[0])
  } catch {
    return { error: 'AI response was not valid JSON' }
  }

  if (parsed.error) {
    return { error: parsed.error }
  }

  if (
    typeof parsed.customerName !== 'string' ||
    !parsed.customerName.trim() ||
    typeof parsed.product !== 'string' ||
    !parsed.product.trim() ||
    typeof parsed.amount !== 'number' ||
    !(parsed.amount > 0) ||
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

/** Runs a generateContent call across the model fallback list, returning the first success. */
async function generateWithFallback(parts: (string | { inlineData: { mimeType: string; data: string } })[]) {
  let lastError: unknown
  for (const modelName of MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName, safetySettings })
      const result = await model.generateContent(parts)
      return result.response.text()
    } catch (error) {
      console.warn(`Gemini model ${modelName} failed, trying next fallback…`, error)
      lastError = error
    }
  }
  throw lastError ?? new Error('No Gemini models available')
}

export async function extractFromText(text: string): Promise<ExtractResult> {
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

  try {
    const raw = await generateWithFallback([prompt])
    return parseExtraction(raw)
  } catch (error) {
    console.error('Gemini Text Error:', error)
    // No fabricated transaction here — a bookkeeping app must never silently invent
    // financial records. Surface the failure and let the UI ask the user to retry.
    return { error: 'AI processing failed — please try again' }
  }
}

export async function extractFromImage(imageBase64: string, mimeType: string = 'image/jpeg'): Promise<ExtractResult> {
  const prompt = `
You are an AI assistant for Ethiopian merchants. Extract transaction details from this image of a handwritten ledger entry.

Return ONLY a valid JSON object with this exact structure, and nothing else:
${EXTRACTION_SCHEMA}

If you cannot read the image clearly, return:
{"error": "Could not read image clearly"}
`

  try {
    const raw = await generateWithFallback([prompt, { inlineData: { mimeType, data: imageBase64 } }])
    return parseExtraction(raw)
  } catch (error) {
    console.error('Gemini Vision Error:', error)
    return { error: 'AI processing failed — please try again' }
  }
}

/**
 * Extracts a transaction directly from a voice recording (Amharic or English).
 *
 * Deliberately does NOT go through the browser's Web Speech API first — that
 * transcription step is unreliable for Amharic (real-world word error rates
 * reported above 60% on comparable ASR pipelines), so a bad transcript would
 * poison the extraction before Gemini ever sees it. Sending the raw audio
 * straight to Gemini lets it transcribe and extract jointly, using the full
 * audio signal rather than someone else's lossy guess at the text.
 */
export async function extractFromAudio(audioBase64: string, mimeType: string): Promise<ExtractResult> {
  const prompt = `
You are an AI assistant for Ethiopian merchants. Listen to this voice recording, which may be in
Amharic, English, or a mix of both. It describes a single business transaction — a customer buying
something on credit, or a customer paying for something.

Transcribe what was said, then extract the transaction. Spoken numbers (including Amharic number
words) must be converted to plain digits for "amount" and "quantity".

Return ONLY a valid JSON object with this exact structure, and nothing else:
{
  "transcript": "string (what was said, transcribed as-is in the language it was spoken)",
  "customerName": "string (the customer's name)",
  "product": "string (what was bought/sold)",
  "quantity": number (how many items, default 1 if not specified),
  "amount": number (total amount in Birr),
  "type": "credit" OR "debit" (credit = customer owes money, debit = customer paid),
  "description": "string (any additional details)"
}

If you cannot make out a clear transaction, return:
{"error": "Could not understand the recording"}
`

  try {
    const raw = await generateWithFallback([prompt, { inlineData: { mimeType, data: audioBase64 } }])
    return parseExtraction(raw)
  } catch (error) {
    console.error('Gemini Audio Error:', error)
    return { error: 'AI processing failed — please try again' }
  }
}