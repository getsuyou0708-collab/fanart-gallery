import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { artworks } = await req.json()
    console.log('[Reorder] Received artworks:', artworks.length)

    // 更新 Supabase 中所有记录的 order 和其他字段
    for (let i = 0; i < artworks.length; i++) {
      const artwork = artworks[i]
      const updateData: any = { order: i + 1 }

      // 如果提供了 title/works/cps/tags/createdAt，则一并更新
      if (artwork.title !== undefined) updateData.title = artwork.title
      if (artwork.works !== undefined) updateData.works = artwork.works
      if (artwork.cps !== undefined) updateData.cps = artwork.cps
      if (artwork.tags !== undefined) updateData.tags = artwork.tags
      if (artwork.createdAt !== undefined) {
        updateData.createdAt = artwork.createdAt
        console.log('[Reorder] Updating createdAt for', artwork.id, 'to', artwork.createdAt)
      }

      const { error } = await supabase
        .from('artworks')
        .update(updateData)
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
        await fetch(`https://fanart-gallery.vercel.app/api/revalidate?path=/stats&secret=${secret}`)
      } catch (e) {
        console.log('[Reorder] Revalidation error:', e)
      }
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: '保存失败' }, { status: 500 })
  }
}