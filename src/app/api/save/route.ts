import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { Artwork } from '@/lib/types'

export async function POST(req: NextRequest) {
  const authCookie = req.cookies.get('auth')
  if (authCookie?.value !== 'authenticated') {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const { artworks } = await req.json()

    if (!artworks || !Array.isArray(artworks)) {
      return NextResponse.json({ error: '无效的数据' }, { status: 400 })
    }

    // 获取当前最大的 order
    const { data: existing } = await supabase
      .from('artworks')
      .select('order')
      .order('order', { ascending: false })
      .limit(1)

    const maxOrder = existing && existing.length > 0 ? existing[0].order : 0

    //插入所有作品
    const artworksWithOrder = artworks.map((artwork: Artwork, index: number) => ({
      ...artwork,
      order: maxOrder + index + 1
    }))

    const { error } = await supabase
      .from('artworks')
      .insert(artworksWithOrder)

    if (error) {
      console.error('[Save] Supabase insert error:', error)
      return NextResponse.json({ error: '保存失败: ' + error.message }, { status: 500 })
    }

    // 刷新缓存
    const secret = process.env.REVALIDATION_SECRET
    if (secret) {
      try {
        await fetch(`https://fanart-gallery.vercel.app/api/revalidate?path=/&secret=${secret}`)
        await fetch(`https://fanart-gallery.vercel.app/api/revalidate?path=/manage&secret=${secret}`)
      } catch (e) {
        console.log('[Save] Revalidation error:', e)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Save] Error:', error)
    return NextResponse.json({ error: '保存失败' }, { status: 500 })
  }
}