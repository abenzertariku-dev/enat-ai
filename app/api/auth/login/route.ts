import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

// A real bcrypt hash of an unguessable, unused value — computed once at module
// load — used only to keep "user not found" timing in line with "wrong
// password" below. (A hand-written fake hash string would make bcrypt.compare
// throw, since it isn't valid bcrypt output — has to be generated for real.)
const DUMMY_HASH = bcrypt.hashSync('no-such-user-timing-guard', 10)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''

    if (!email || !password) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        businessName: true,
        phone: true,
        password: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    // Always run bcrypt.compare, even when there's no user, so a missing
    // account doesn't respond measurably faster than a wrong password —
    // otherwise response time alone reveals which emails are registered.
    const isValid = await bcrypt.compare(password, user?.password ?? DUMMY_HASH)

    if (!user || !isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET!, {
      expiresIn: '7d',
    })

    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json({
      success: true,
      token,
      user: userWithoutPassword,
    })
  } catch (error) {
    console.error('Login Error:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}