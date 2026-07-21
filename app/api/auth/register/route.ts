import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, businessName, phone } = await req.json()

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user with password
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,  // ✅ Store hashed password
        businessName,
        phone
      },
      select: {
        id: true,
        name: true,
        email: true,
        businessName: true,
        phone: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return NextResponse.json({
      success: true,
      user
    })
  } catch (error) {
    console.error('Register Error:', error)
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    )
  }
}