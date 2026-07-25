import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { Prisma } from '@prisma/client'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8
const MAX_PHONE_LENGTH = 15
const MAX_TEXT_LENGTH = 255

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // ─── Validate Required Fields ─────────────────────────────────────
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    
    // Optional fields
    const businessName = typeof body.businessName === 'string' ? body.businessName.trim() : null
    const phone = typeof body.phone === 'string' ? body.phone.trim() : null
    const businessType = typeof body.businessType === 'string' ? body.businessType.trim() : null
    const teamSize = typeof body.teamSize === 'string' ? body.teamSize.trim() : null
    const location = typeof body.location === 'string' ? body.location.trim() : null
    const challenge = typeof body.challenge === 'string' ? body.challenge.trim() : null

    // ─── Validation ──────────────────────────────────────────────────
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
    }
    
    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
        { status: 400 }
      )
    }

    // Optional field length limits
    if (phone && phone.length > MAX_PHONE_LENGTH) {
      return NextResponse.json(
        { error: `Phone number is too long (max ${MAX_PHONE_LENGTH} characters)` },
        { status: 400 }
      )
    }

    if (businessName && businessName.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `Business name is too long (max ${MAX_TEXT_LENGTH} characters)` },
        { status: 400 }
      )
    }

    // ─── Check Existing User ──────────────────────────────────────────
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 })
    }

    // ─── Hash Password ────────────────────────────────────────────────
    const hashedPassword = await bcrypt.hash(password, 10)

    // ─── Create User ──────────────────────────────────────────────────
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        businessName,
        phone,
        businessType,
        teamSize,
        location,
        challenge,
      },
      select: {
        id: true,
        name: true,
        email: true,
        businessName: true,
        phone: true,
        businessType: true,
        teamSize: true,
        location: true,
        challenge: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ 
      success: true, 
      user,
      message: 'Account created successfully'
    })
    
  } catch (error) {
    // ─── Handle Duplicate Email ───────────────────────────────────────
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 })
    }
    
    console.error('Register Error:', error)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}