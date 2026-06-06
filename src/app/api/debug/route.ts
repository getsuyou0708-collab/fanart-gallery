import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    hasAccessKeyId: !!process.env.ALI_ACCESS_KEY_ID,
    accessKeyIdLength: process.env.ALI_ACCESS_KEY_ID?.length || 0,
    accessKeyIdPrefix: process.env.ALI_ACCESS_KEY_ID?.substring(0, 10) || '',
  })
}