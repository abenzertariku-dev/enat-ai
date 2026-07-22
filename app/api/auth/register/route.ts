import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { Prisma } from '@prisma/client'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    const businessName = typeof body.businessName === 'string' ? body.businessName.trim() : null
    const phone = typeof body.phone === 'string' ? body.phone.trim() : null

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

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        businessName,
        phone,
      },
      select: {
        id: true,
        name: true,
        email: true,
        businessName: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ success: true, user })
  } catch (error) {
    // Two near-simultaneous requests with the same email can both pass the
    // findUnique check above and race to create() — the DB's unique
    // constraint catches it here as a P2002 error instead of a generic 500.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 })
    }
    console.error('Register Error:', error)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}