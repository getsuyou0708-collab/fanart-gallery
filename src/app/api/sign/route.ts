import { NextRequest, NextResponse } from 'next/server'
import OSS from 'ali-oss'
import crypto from 'crypto'

let client: OSS | null = null

function getClient() {
  if (!client) {
    client = new OSS({
      region: 'oss-cn-wulanchabu',
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
    const { filename } = await req.json()

    if (!filename) {
      return NextResponse.json({ error: '缺少文件名' }, { status: 400 })
    }

    // 生成唯一文件名
    const id = `art_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const ext = filename.split('.').pop()?.toLowerCase() || 'jpg'
    const objectKey = `fanart-gallery/${id}.${ext}`

    // 生成 OSS 表单上传签名
    const accessKeyId = process.env.ALI_ACCESS_KEY_ID!
    const accessKeySecret = process.env.ALI_ACCESS_KEY_SECRET!

    // 创建 policy
    const policy = Buffer.from(JSON.stringify({
      expiration: new Date(Date.now() + 3600000).toISOString(), // 1小时后过期
      conditions: [
        ['content-length-range', 0, 10 * 1024 * 1024], // 10MB
        { bucket: 'xiaoxiao0708' },
        { key: objectKey }
      ]
    })).toString('base64')

    // 计算签名
    const signature = crypto
      .createHmac('sha1', accessKeySecret)
      .update(policy)
      .digest('base64')

    return NextResponse.json({
      objectKey,
      accessKeyId,
      policy,
      signature,
      host: 'https://xiaoxiao0708.oss-cn-wulanchabu.aliyuncs.com'
    })
  } catch (error) {
    console.error('[Sign] Error:', error)
    return NextResponse.json({ error: '签名失败: ' + String(error) }, { status: 500 })
  }
}