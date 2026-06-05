import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function POST(req: NextRequest) {
  try {
    const { artworks } = await req.json()

    const dataPath = path.join(process.cwd(), 'public', 'data', 'artworks.json')
    fs.writeFileSync(dataPath, JSON.stringify(artworks, null, 2))

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: '保存失败' }, { status: 500 })
  }
}