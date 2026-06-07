import { NextRequest, NextResponse } from 'next/server'
import OSS from 'ali-oss'

let client: OSS | null = null

function getClient() {
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
    const { filename } = await req.json()

    if (!filename) {
      return NextResponse.json({ error: '缺少文件名' }, { status: 400 })
    }

    // 生成唯一文件名
    const id = `art_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const ext = filename.split('.').pop()?.toLowerCase() || 'jpg'
    const objectKey = `fanart-gallery/${id}.${ext}`

    // 使用 SDK 获取上传凭证
    const ossClient = getClient()
    const policy = await ossClient.calculatePostSignature()

    return NextResponse.json({
      objectKey,
      accessKeyId: process.env.ALI_ACCESS_KEY_ID,
      policy: policy.policy,
      signature: policy.signature,
      host: 'https://xiaoxiao0708.oss-cn-shanghai.aliyuncs.com',
      ossAccessKeyId: process.env.ALI_ACCESS_KEY_ID
    })
  } catch (error) {
    console.error('[Sign] Error:', error)
    return NextResponse.json({ error: '签名失败: ' + String(error) }, { status: 500 })
  }
}