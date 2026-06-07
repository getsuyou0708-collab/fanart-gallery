import { NextRequest, NextResponse } from 'next/server'
import OSS from 'ali-oss'
import { Artwork } from '@/lib/types'
import { supabase } from '@/lib/supabase'

let client: OSS | null = null

function getOSSClient() {
  if (!client) {
    client = new OSS({
      region: 'oss-cn-wulanchabu',
      accessKeyId: process.env.ALI_ACCESS_KEY_ID!,
      accessKeySecret: process.env.ALI_ACCESS_KEY_SECRET!,
      bucket: 'xiaoxiao0708',
      endpoint: 'oss-cn-wulanchabu.aliyuncs.com'
    } as any)
  }
  return client
}

export async function POST(req: NextRequest) {
  console.log('[Upload] Starting upload...')

  const authCookie = req.cookies.get('auth')
  if (authCookie?.value !== 'authenticated') {
    console.log('[Upload] Auth failed')
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const dataStr = formData.get('data') as string

    if (!file || !dataStr) {
      return NextResponse.json({ error: '缺少文件或数据' }, { status: 400 })
    }

    // 10MB limit
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: '图片过大，请压缩到 10MB 以下' }, { status: 400 })
    }

    const metadata = JSON.parse(dataStr)
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const id = `art_${Date.now()}`
    const filename = `fanart-gallery/${id}.${ext}`

    console.log('[Upload] Uploading file:', filename, 'size:', file.size)

    const buffer = Buffer.from(await file.arrayBuffer())
    const ossClient = getOSSClient()

    const result = await ossClient.put(filename, buffer)
    console.log('[Upload] OSS result:', result)

    // 获取当前最大的 order
    const { data: existing } = await supabase
      .from('artworks')
      .select('order')
      .order('order', { ascending: false })
      .limit(1)

    const maxOrder = existing && existing.length > 0 ? existing[0].order : 0

    const newArtwork: Artwork = {
      id,
      title: metadata.title,
      filename: filename,
      type: metadata.type,
      works: metadata.works,
      cps: metadata.cps,
      tags: metadata.tags,
      order: maxOrder + 1,
      createdAt: metadata.date ? new Date(metadata.date).toISOString() : new Date().toISOString()
    }

    const { error } = await supabase
      .from('artworks')
      .insert([newArtwork])

    if (error) {
      console.error('[Upload] Supabase insert error:', error)
      return NextResponse.json({ error: '保存失败: ' + error.message }, { status: 500 })
    }

    // 刷新 CDN 缓存
    const secret = process.env.REVALIDATION_SECRET
    if (secret) {
      try {
        await fetch(`https://fanart-gallery.vercel.app/api/revalidate?path=/&secret=${secret}`)
        await fetch(`https://fanart-gallery.vercel.app/api/revalidate?path=/manage&secret=${secret}`)
      } catch (e) {
        console.log('[Upload] Revalidation error:', e)
      }
    }

    return NextResponse.json({ success: true, artwork: newArtwork })
  } catch (error) {
    console.error('[Upload] Error:', error)
    return NextResponse.json({ error: '上传失败: ' + String(error) }, { status: 500 })
  }
}