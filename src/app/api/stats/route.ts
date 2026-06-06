import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data: artworks, error } = await supabase
      .from('artworks')
      .select('*')
      .order('order', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ artworks: artworks || [] })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}