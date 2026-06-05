import { NextRequest, NextResponse } from 'next/server'
import { unlink } from 'fs/promises'
import path from 'path'

export async function DELETE(req: NextRequest) {
  const authCookie = req.cookies.get('auth')
  if (authCookie?.value !== 'authenticated') {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: '缺少ID' }, { status: 400 })
  }

  try {
    // 从 artworks.json 读取数据
    const { readFile, writeFile } = await import('fs/promises')
    const dataPath = path.join(process.cwd(), 'public', 'data', 'artworks.json')
    const data = await readFile(dataPath, 'utf-8')
    const artworks = JSON.parse(data)

    const artwork = artworks.find((a: any) => a.id === id)
    if (!artwork) {
      return NextResponse.json({ error: '作品不存在' }, { status: 404 })
    }

    // 删除文件
    try {
      const filePath = path.join(
        process.cwd(),
        'public',
        'assets',
        artwork.type === 'video' ? 'videos' : 'images',
        artwork.filename
      )
      await unlink(filePath)
    } catch {}

    // 从列表中移除
    const newArtworks = artworks.filter((a: any) => a.id !== id)
    await writeFile(dataPath, JSON.stringify(newArtworks, null, 2))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json({ error: '删除失败' }, { status: 500 })
  }
}