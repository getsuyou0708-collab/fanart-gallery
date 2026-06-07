import { NextRequest, NextResponse } from 'next/server'
import OSS from 'ali-oss'

let client: OSS | null = null

function getOSSClient() {
  if (!client) {
    client = new OSS({
      region: 'oss-cn-shanghai',
      accessKeyId: process.env.ALI_ACCESS_KEY_ID!,
      accessKeySecret: process.env.ALI_ACCESS_KEY_SECRET!,
      bucket: 'xiaoxiao0708'
    })
  }
  return client
}

export async function POST(req: NextRequest) {
  const authCookie = req.cookies.get('auth')
  if (authCookie?.value !== 'authenticated') {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const { artworkId } = await req.json()

    if (!artworkId) {
      return NextResponse.json({ error: '缺少作品ID' }, { status: 400 })
    }

    const ossClient = getOSSClient()
    const settings = { coverArtworkId: artworkId }
    await ossClient.put('fanart-gallery/settings.json', Buffer.from(JSON.stringify(settings)))

    // 刷新缓存
    const secret = process.env.REVALIDATION_SECRET
    if (secret) {
      try {
        await fetch(`https://fanart-gallery.vercel.app/api/revalidate?path=/&secret=${secret}`)
      } catch (e) {
        console.log('[Cover] Revalidation error:', e)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Cover] Error:', error)
    return NextResponse.json({ error: '设置失败: ' + String(error) }, { status: 500 })
  }
}