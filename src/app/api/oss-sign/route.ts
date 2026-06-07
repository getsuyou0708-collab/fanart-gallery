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
    } as any)
  }
  return client
}

export async function POST(req: NextRequest) {
  const authCookie = req.cookies.get('auth')
  if (authCookie?.value !== 'authenticated') {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const { filename, contentType } = await req.json()

    if (!filename || !contentType) {
      return NextResponse.json({ error: '缺少 filename 或 contentType' }, { status: 400 })
    }

    // 生成唯一 object key
    const id = `art_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const ext = filename.split('.').pop()?.toLowerCase() || 'jpg'
    const objectKey = `fanart-gallery/${id}.${ext}`

    const ossClient = getOSSClient()

    // 生成直传签名 URL（有效期 1 小时）
    const signUrl = ossClient.signatureUrl(objectKey, {
      method: 'PUT',
      'Content-Type': contentType,
      expires: 3600
    })

    // 构造最终的 OSS 上传 URL
    const uploadUrl = signUrl.split('?')[0]

    return NextResponse.json({
      uploadUrl,      // PUT 请求的目标 URL
      objectKey,     // 上传后的文件路径
      imageUrl: `https://xiaoxiao0708.oss-cn-shanghai.aliyuncs.com/${objectKey}` // 访问 URL
    })
  } catch (error) {
    console.error('[oss-sign] Error:', error)
    return NextResponse.json({ error: '签名失败: ' + String(error) }, { status: 500 })
  }
}