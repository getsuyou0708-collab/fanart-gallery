import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function DELETE(req: NextRequest) {
  const authCookie = req.cookies.get('auth')
  if (authCookie?.value !== 'authenticated') {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: '缺少ID' }, { status: 400 })
  }

  try {
    // 从 Supabase 删除
    const { error } = await supabase
      .from('artworks')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[Delete] Supabase delete error:', error)
      return NextResponse.json({ error: '删除失败: ' + error.message }, { status: 500 })
    }

    // 刷新 CDN 缓存（通过 Vercel API）
    const secret = process.env.REVALIDATION_SECRET
    if (secret) {
      try {
        await fetch(`https://fanart-gallery.vercel.app/api/revalidate?path=/&secret=${secret}`)
        await fetch(`https://fanart-gallery.vercel.app/api/revalidate?path=/manage&secret=${secret}`)
      } catch (e) {
        console.log('[Delete] Revalidation error:', e)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete error:', error)
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: '删除失败: ' + message }, { status: 500 })
  }
}