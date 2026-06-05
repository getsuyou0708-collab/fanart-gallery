import { NextRequest, NextResponse } from 'next/server'
import OSS from 'ali-oss'
import { Artwork } from '@/lib/types'

// 阿里云 OSS 配置
const client = new OSS({
  region: 'oss-cn-shanghai',
  accessKeyId: process.env.ALI_ACCESS_KEY_ID,
  accessKeySecret: process.env.ALI_ACCESS_KEY_SECRET,
  bucket: 'xiaoxiao0708'
})

function toSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[×x]/g, '-')
}

export async function POST(req: NextRequest) {
  try {
    // 验证认证
    const authCookie = req.cookies.get('auth')
    if (authCookie?.value !== 'authenticated') {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const dataStr = formData.get('data') as string

    if (!file || !dataStr) {
      return NextResponse.json({ error: '缺少文件或数据' }, { status: 400 })
    }

    const metadata = JSON.parse(dataStr)
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const id = `art_${Date.now()}`
    const filename = `${id}.${ext}`

    // 上传到阿里云 OSS
    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await client.put(`fanart-gallery/${filename}`, buffer)

    // 更新 artworks.json
    const dataPath = '/Users/yueyaowan/Library/Application Support/CherryStudio/Data/Agents/t-default/fanart-gallery/public/data/artworks.json'
    let artworks: Artwork[] = []

    try {
      const { readFile } = await import('fs/promises')
      const existing = await readFile(dataPath, 'utf-8')
      artworks = JSON.parse(existing)
    } catch {}

    const newArtwork: Artwork = {
      id,
      title: metadata.title,
      filename: result.name,  // 存储 OSS 上的路径名，如 "fanart-gallery/art_xxx.jpg"
      type: metadata.type,
      works: metadata.works,
      cps: metadata.cps,
      tags: metadata.tags,
      order: artworks.length + 1,
      createdAt: new Date().toISOString()
    }

    artworks.push(newArtwork)

    await writeFile(dataPath, JSON.stringify(artworks, null, 2))

    return NextResponse.json({ success: true, artwork: newArtwork })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: '上传失败' }, { status: 500 })
  }
}

async function writeFile(path: string, content: string) {
  const { writeFile } = await import('fs/promises')
  return writeFile(path, content)
}