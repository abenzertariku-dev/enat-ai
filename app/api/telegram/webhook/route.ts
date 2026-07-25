// import { NextRequest, NextResponse } from 'next/server'
// import { prisma } from '@/lib/prisma'
// import jwt from 'jsonwebtoken'

// const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
// const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`

// async function sendTelegramMessage(chatId: string, text: string) {
//   const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ chat_id: chatId, text })
//   })
//   return response.json()
// }

// export async function POST(req: NextRequest) {
//   try {
//     const body = await req.json()
//     const { message } = body
    
//     if (!message) return NextResponse.json({ ok: true })
    
//     const chatId = message.chat.id
//     const text = message.text?.trim() || ''
    
//     // Parse commands
//     if (text.startsWith('/')) {
//       const [command, ...args] = text.split(' ')
      
//       switch (command) {
//         case '/start':
//           await sendTelegramMessage(chatId, 
//             '📒 Welcome to EthioGenz Ledger!\n\n' +
//             'Commands:\n' +
//             '/add [customer] [amount] [product] [credit/debit]\n' +
//             '/balance [customer]\n' +
//             '/customers\n' +
//             '/stats\n' +
//             '/insights'
//           )
//           break
          
//         case '/add':
//           // Parse: /add Kebede 16000 teff credit
//           const [customer, amount, product, type] = args
//           if (!customer || !amount) {
//             await sendTelegramMessage(chatId, '❌ Usage: /add [customer] [amount] [product] [credit/debit]')
//             break
//           }
          
//           // Get user by Telegram chat ID (you'll need to link accounts)
//           // For demo, use a default user
//           const userId = 'your-user-id'
          
//           const transaction = await prisma.transaction.create({
//             data: {
//               customer: { connectOrCreate: { where: { name: customer }, create: { name: customer, userId } } },
//               userId,
//               product: product || 'Unknown',
//               amount: parseFloat(amount),
//               type: type === 'debit' ? 'debit' : 'credit',
//               status: type === 'debit' ? 'paid' : 'unpaid',
//               description: `Added via Telegram`
//             }
//           })
          
//           await sendTelegramMessage(
//             chatId,
//             `✅ Transaction added!\n${customer} owes ${amount} Br for ${product}`
//           )
//           break
          
//         case '/balance':
//           // Check customer balance
//           const [customerName] = args
//           if (!customerName) {
//             await sendTelegramMessage(chatId, '❌ Usage: /balance [customer]')
//             break
//           }
          
//           const customerData = await prisma.customer.findFirst({
//             where: { name: customerName }
//           })
          
//           if (customerData) {
//             await sendTelegramMessage(
//               chatId,
//               `👤 ${customerData.name}\n📊 Total Debt: ${customerData.totalDebt} Br\n💳 Total Paid: ${customerData.totalPaid} Br`
//             )
//           } else {
//             await sendTelegramMessage(chatId, `❌ Customer "${customerName}" not found`)
//           }
//           break
          
//         case '/customers':
//           const customers = await prisma.customer.findMany({
//             where: { userId: 'your-user-id' },
//             orderBy: { totalDebt: 'desc' },
//             take: 5
//           })
          
//           const customerList = customers.map(c => 
//             `${c.name}: ${c.totalDebt} Br due`
//           ).join('\n')
          
//           await sendTelegramMessage(
//             chatId,
//             `👥 Top Customers:\n${customerList || 'No customers yet'}`
//           )
//           break
          
//         case '/stats':
//           const stats = await prisma.transaction.aggregate({
//             where: { userId: 'your-user-id' },
//             _sum: { amount: true }
//           })
          
//           const debt = await prisma.transaction.aggregate({
//             where: { userId: 'your-user-id', status: 'unpaid' },
//             _sum: { amount: true }
//           })
          
//           await sendTelegramMessage(
//             chatId,
//             `📊 Business Stats:\n💰 Total Sales: ${stats._sum.amount || 0} Br\n🔴 Outstanding Debt: ${debt._sum.amount || 0} Br`
//           )
//           break
          
//         case '/insights':
//           // Trigger AI insights
//           const insights = await fetch(`${req.nextUrl.origin}/api/ai/insights`, {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({ transactions: [] }) // Pass your transactions
//           }).then(r => r.json())
          
//           await sendTelegramMessage(
//             chatId,
//             `💡 AI Insights:\n${insights.insights?.map((i: string) => `• ${i}`).join('\n') || 'Generating insights...'}`
//           )
//           break
          
//         default:
//           await sendTelegramMessage(chatId, '❌ Unknown command. Use /help for available commands.')
//       }
//     }
    
//     return NextResponse.json({ ok: true })
//   } catch (error) {
//     console.error('Telegram Error:', error)
//     return NextResponse.json({ ok: false })
//   }
// }