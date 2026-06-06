import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { artworks } = await req.json()

    // 更新 Supabase 中所有记录的 order
    for (let i = 0; i < artworks.length; i++) {
      const artwork = artworks[i]
      const { error } = await supabase
        .from('artworks')
        .update({ order: i + 1 })
        .eq('id', artwork.id)

      if (error) {
        console.error('[Reorder] Update error:', error)
        return NextResponse.json({ error: '保存失败' }, { status: 500 })
      }
    }

    // 刷新 CDN 缓存（通过 Vercel API）
    const secret = process.env.REVALIDATION_SECRET
    if (secret) {
      try {
        await fetch(`https://fanart-gallery.vercel.app/api/revalidate?path=/&secret=${secret}`)
        await fetch(`https://fanart-gallery.vercel.app/api/revalidate?path=/manage&secret=${secret}`)
      } catch (e) {
        console.log('[Reorder] Revalidation error:', e)
      }
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: '保存失败' }, { status: 500 })
  }
}