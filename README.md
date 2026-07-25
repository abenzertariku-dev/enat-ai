<<<<<<< HEAD
<div align="center">
  <img src="https://via.placeholder.com/800x200/0F6B4C/ffffff?text=📒+EthioGenz+Ledger" alt="EthioGenz Ledger Banner" width="800" />
  
  <h1>enat ai</h1>
  <p><strong>Turn Every Defter into Smart Business Intelligence</strong></p>
  
  <!-- Badges -->
  <p>
    <img src="https://img.shields.io/badge/Next.js-16.2.11-black?style=flat-square&logo=next.js" alt="Next.js" />
    <img src="https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Prisma-6.19.1-2D3748?style=flat-square&logo=prisma" alt="Prisma" />
    <img src="https://img.shields.io/badge/Tailwind-4.0-06B6D4?style=flat-square&logo=tailwind-css" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/Gemini_AI-3.5_Flash-4285F4?style=flat-square&logo=google" alt="Gemini AI" />
    <img src="https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square" alt="License" />
    <img src="https://img.shields.io/badge/Status-Production_Ready-brightgreen?style=flat-square" alt="Status" />
  </p>
  
  <p>
    <a href="#-live-demo">Live Demo</a> •
    <a href="#-features">Features</a> •
    <a href="#-technology-stack">Tech Stack</a> •
    <a href="#-installation">Installation</a> •
    <a href="#-api-documentation">API Docs</a> •
    <a href="#-contributing">Contributing</a>
  </p>
</div>

---

## 📖 **Overview**

**Enat-Ai** is an AI-powered digital bookkeeping assistant designed specifically for Ethiopian micro and small businesses. Using only a smartphone, merchants can transform traditional paper bookkeeping ("Defter") into an intelligent digital ledger without learning complicated accounting software.

### 🎯 **The Problem**

Across Ethiopia, thousands of small businesses, kiosks, and Merkato merchants still rely on handwritten notebooks to record sales, customer debts, and daily transactions. These paper records are:

- ❌ **Difficult to search** - Can't find past transactions
- ❌ **Easy to lose** - One accident and records are gone
- ❌ **Hard to analyze** - No insights into cash flow
- ❌ **Challenging to follow up** - Unpaid credit is often forgotten

### ✅ **Our Solution**

EthioGenz Ledger solves these problems by providing:

- 📸 **AI Photo-to-Ledger (OCR)** - Take a photo, AI extracts data
- 🎙️ **Voice-Powered Bookkeeping** - Speak in Amharic, AI records transactions
- 📊 **Smart Business Dashboard** - Real-time insights and analytics
- 📦 **Stock Management** - Track inventory and get low stock alerts
- 📱 **SMS Reminders** - One-tap reminders for unpaid debts
- 🤖 **AI Debt Guardian** - AI-powered debt collection assistant

---

## ✨ **Live Demo**

> **🚀 Live URL:** [https://ethiogenz.vercel.app](https://ethiogenz.vercel.app)

### Demo Credentials


Email: demo@ethiogenz.com
Password: demopassword123
text


> **⚠️ Note:** This is a hackathon project. The demo uses a free tier API with limited requests.

---

## 🎨 **Features**

### 📸 AI Photo-to-Ledger (OCR)
Users simply take a photo of their handwritten notebook. AI extracts customer names, products, quantities, prices, and balances, then automatically organizes everything into a searchable digital ledger.

### 🎙️ Voice-Powered Bookkeeping
Merchants can record transactions by speaking naturally in Amharic or English.

*Example:*
> *"Kebede bought two bags of teff on credit for 16,000 Birr."*

The AI understands the customer, products, payment type, and amount, then instantly records the transaction.

### 📊 Smart Business Dashboard
A simple mobile dashboard provides:
- Daily and weekly sales
- Outstanding customer debts
- Customer payment history
- Business insights and trends
- Interactive charts and analytics
- One-tap SMS reminders for customers with unpaid balances

### 📦 Stock Management
- Bulk import items with pricing
- Track inventory levels
- Auto-deduct stock from sales
- Low stock alerts and notifications
- Sales history per item

### 🤖 AI Debt Guardian
- Reads customer debt history
- Generates friendly reminders in Amharic & English
- Recommends best actions (SMS, Call, Payment Plan)
- Risk assessment and prioritization

### 📈 Business Insights
- AI-powered analytics
- Personalized insights based on business type
- Revenue and debt trends
- Top products and customers
- Collection rate analysis

---

## 🛠️ **Technology Stack**

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 16.2.11 | React framework with SSR & API routes |
| **React** | 19.2.4 | UI library |
| **TypeScript** | ^5 | Type safety |
| **Tailwind CSS** | ^4 | Styling |
| **Lucide React** | ^1.25.0 | Icons |
| **Recharts** | ^3.10.0 | Data visualization |
| **React Hook Form** | ^7.82.0 | Form handling |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js API Routes** | 16.2.11 | Serverless backend |
| **Prisma ORM** | ^6.19.1 | Database ORM |
| **SQLite** | ^6.0.1 | Database |
| **JWT** | ^9.0.2 | Authentication |
| **bcryptjs** | ^2.4.3 | Password hashing |

### AI & Machine Learning
| Technology | Purpose |
|------------|---------|
| **Google Gemini 3.5 Flash** | OCR, Voice, NLP, Insights |
| **Web Speech API** | Voice recognition (Amharic) |

### Deployment
| Platform | Purpose |
|----------|---------|
| **Vercel** | Hosting (Free Tier) |

---

## 📁 **Project Structure**

ethiogenz-ledger/
├── app/
│ ├── api/
│ │ ├── ai/
│ │ │ ├── debt-guardian/route.ts # AI debt analysis
│ │ │ └── insights/route.ts # AI business insights
│ │ ├── auth/
│ │ │ ├── login/route.ts # Login endpoint
│ │ │ ├── register/route.ts # Registration endpoint
│ │ │ └── me/route.ts # Get current user
│ │ ├── stock/
│ │ │ ├── route.ts # Stock CRUD
│ │ │ └── alerts/route.ts # Stock alerts
│ │ ├── stock-sales/route.ts # Sales tracking
│ │ ├── dashboard/route.ts # Dashboard data
│ │ ├── upload/route.ts # Image OCR
│ │ ├── voice/route.ts # Voice processing
│ │ └── transactions/route.ts # Transaction CRUD
│ ├── components/
│ │ ├── Navigation.tsx # Main navigation
│ │ ├── DashboardContent.tsx # Dashboard
│ │ ├── ScanContent.tsx # OCR scanner
│ │ ├── VoiceContent.tsx # Voice input
│ │ ├── TransactionsContent.tsx # Transactions list
│ │ ├── CustomersContent.tsx # Customer management
│ │ ├── BusinessInsights.tsx # Analytics
│ │ ├── StockInventory.tsx # Stock management
│ │ ├── StockImporter.tsx # Bulk import
│ │ ├── StockSales.tsx # Sales recording
│ │ ├── StockAlerts.tsx # Alerts
│ │ ├── DebtGuardian.tsx # AI debt assistant
│ │ └── SettingsContent.tsx # Settings
│ ├── login/page.tsx # Login/Register page
│ ├── dashboard/page.tsx # Dashboard page
│ └── page.tsx # Landing page
├── lib/
│ ├── prisma.ts # Prisma client
│ ├── gemini.ts # Gemini AI integration
│ ├── stock.ts # Stock helpers
│ └── transactions.ts # Transaction helpers
├── prisma/
│ └── schema.prisma # Database schema
├── public/ # Static assets
├── .env.example # Environment variables
├── .gitignore # Git ignore
├── package.json # Dependencies
├── tsconfig.json # TypeScript config
├── tailwind.config.js # Tailwind config
└── README.md # This file
text


---

## 🔧 **Installation & Setup**

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) (v9 or higher)

### Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/ethiogenz-ledger.git
cd ethiogenz-ledger

Step 2: Install Dependencies
bash

npm install

Step 3: Set Up Environment Variables

Create a .env file in the root directory:
bash

cp .env.example .env

Update the .env file with your values:
env

# Database
DATABASE_URL="file:./dev.db"

# Authentication
JWT_SECRET="your-super-secret-jwt-key-change-this"

# AI Services (Get from Google AI Studio)
GEMINI_API_KEY="your-google-gemini-api-key"

# Telegram Bot (Optional)
TELEGRAM_BOT_TOKEN="your-telegram-bot-token"

Get your API keys:

    Google Gemini API Key (FREE)

    Telegram Bot Token (FREE)

Step 4: Set Up Database
bash

# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

Step 5: Run Development Server
bash

npm run dev

Open http://localhost:3000 to see the app.
📡 API Documentation
Authentication Endpoints
Method	Endpoint	Description
POST	/api/auth/register	Create new account
POST	/api/auth/login	Login user
GET	/api/auth/me	Get current user
Transaction Endpoints
Method	Endpoint	Description
GET	/api/dashboard	Get dashboard data
GET	/api/transactions	Get transactions
PUT	/api/transactions	Update transaction
POST	/api/voice	Process voice input
POST	/api/upload	Process image OCR
Stock Endpoints
Method	Endpoint	Description
GET	/api/stock	Get all stock items
POST	/api/stock	Bulk import items
PUT	/api/stock	Update item
DELETE	/api/stock	Delete item
POST	/api/stock-sales	Record sales
GET	/api/stock/alerts	Get stock alerts
AI Endpoints
Method	Endpoint	Description
GET	/api/ai/debt-guardian	AI debt analysis
POST	/api/ai/insights	AI business insights
🚀 Deployment
=======
# enat-ai
enat Ai Ledger is an AI-powered bookkeeping assistant designed for small businesses and retail merchants in Ethiopia. Many merchants still rely on handwritten notebooks to record sales and customer debts, making it difficult to track finances and make informed business decisions.
>>>>>>> bba0298dcf07e054af4b0f4facb1c97277ef64a6
