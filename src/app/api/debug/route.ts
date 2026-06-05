import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  const DATA_PATH = path.join(process.cwd(), 'public', 'data', 'artworks.json')
  try {
    const content = fs.readFileSync(DATA_PATH, 'utf-8')
    const data = JSON.parse(content) as { id: string; title: string }[]
    return NextResponse.json({
      count: data.length,
      artworks: data.map(a => ({ id: a.id, title: a.title }))
    })
  } catch(e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}