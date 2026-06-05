import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { password } = await req.json()

  // 简单密码验证，生产环境应使用环境变量
  const correctPassword = 'aruba0504'

  if (password === correctPassword) {
    const response = NextResponse.json({ success: true })
    response.cookies.set('auth', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 // 1天
    })
    return response
  }

  return NextResponse.json({ error: '密码错误' }, { status: 401 })
}