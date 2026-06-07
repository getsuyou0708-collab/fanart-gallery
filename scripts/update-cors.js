/**
 * 自动更新 OSS CORS 配置的脚本
 * 在 Vercel 构建时运行，自动添加当前域名到 CORS 允许列表
 */

const OSS = require('ali-oss')

const client = new OSS({
  region: 'oss-cn-wulanchabu',
  accessKeyId: process.env.ALI_ACCESS_KEY_ID,
  accessKeySecret: process.env.ALI_ACCESS_KEY_SECRET,
  bucket: 'xiaoxiao0708'
})

async function updateCORS() {
  // 从环境变量获取当前域名，如果没有则使用默认值
  const currentDomain = process.env.VERCEL_URL || 'fanart-gallery.vercel.app'
  const originToAdd = `https://${currentDomain}`

  console.log(`[CORS] Adding origin: ${originToAdd}`)

  try {
    // 获取现有的 CORS 规则
    const cors = await client.getCORS()
    let rules = []

    if (cors && cors.rules && cors.rules.length > 0) {
      rules = cors.rules.map(rule => ({
        AllowedOrigin: rule.allowedOrigin || [],
        AllowedMethod: rule.allowedMethod || ['GET', 'PUT', 'POST', 'HEAD'],
        AllowedHeader: rule.allowedHeader || ['*'],
        ExposeHeader: rule.exposeHeader || ['ETag'],
        MaxAgeSeconds: rule.maxAgeSeconds || 3600
      }))
    } else {
      // 如果没有现有规则，创建一个默认规则
      rules = [{
        AllowedOrigin: [],
        AllowedMethod: ['GET', 'PUT', 'POST', 'HEAD'],
        AllowedHeader: ['*'],
        ExposeHeader: ['ETag'],
        MaxAgeSeconds: 3600
      }]
    }

    // 为所有规则添加新域名（如果不存在）
    const allOrigins = new Set()
    rules.forEach(rule => {
      if (rule.AllowedOrigin) {
        rule.AllowedOrigin.forEach(origin => allOrigins.add(origin))
      }
    })

    // 添加新域名
    allOrigins.add(originToAdd)
    allOrigins.add('http://localhost:3000')

    // 更新所有规则的 AllowedOrigin
    rules.forEach(rule => {
      rule.AllowedOrigin = Array.from(allOrigins)
    })

    // 设置 CORS 规则
    await client.setCORS(rules)

    console.log(`[CORS] Successfully added ${originToAdd} to allowed origins`)
    console.log(`[CORS] All origins: ${Array.from(allOrigins).join(', ')}`)
  } catch (error) {
    console.error('[CORS] Error:', error.message)
    process.exit(1)
  }
}

updateCORS()
