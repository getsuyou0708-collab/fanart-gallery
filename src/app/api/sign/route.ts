import { NextRequest, NextResponse } from 'next/server'
import OSS from 'ali-oss'
import crypto from 'crypto'

const client = new OSS({
  region: 'oss-cn-shanghai',
  accessKeyId: process.env.ALI_ACCESS_KEY_ID!,
  accessKeySecret: process.env.ALI_ACCESS_KEY_SECRET!,
  bucket: 'xiaoxiao0708'
})

export async function POST(req: NextRequest) {
  const authCookie = req.cookies.get('auth')
  if (authCookie?.value !== 'authenticated') {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const { filename, contentType } = await req.json()

    if (!filename || !contentType) {
      return NextResponse.json({ error: '缺少文件名或类型' }, { status: 400 })
    }

    // 生成唯一文件名
    const id = `art_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const ext = filename.split('.').pop()?.toLowerCase() || 'jpg'
    const objectKey = `fanart-gallery/${id}.${ext}`

    // 计算签名过期时间（15分钟）
    const expire =900
    const start = Math.floor(Date.now() / 1000)
    const end = start + expire

    // 生成上传用的临时凭证
    const policy = Buffer.from(JSON.stringify({
      expiration: new Date(end * 1000).toISOString(),
      conditions: [
        ['content-length-range', 0, 10 * 1024 * 1024], // 10MB
        { bucket: 'xiaoxiao0708' },
        { key: objectKey }
      ]
    })).toString('base64')

    const signature = crypto
      .createHmac('sha1', process.env.ALI_ACCESS_KEY_SECRET!)
      .update(policy)
      .digest('base64')

    return NextResponse.json({
      objectKey,
      accessKeyId: process.env.ALI_ACCESS_KEY_ID,
      policy,
      signature,
      host: 'https://xiaoxiao0708.oss-cn-shanghai.aliyuncs.com',
      expire
    })
  } catch (error) {
    console.error('[Sign] Error:', error)
    return NextResponse.json({ error: '签名失败' }, { status: 500 })
  }
}