import { GalleryData, Artwork, Work, CP } from './types'
import { supabase } from './supabase'

const OSS_BASE = 'https://xiaoxiao0708.oss-cn-shanghai.aliyuncs.com'

// 获取所有数据 - 从 Supabase 读取
export async function getGalleryData(): Promise<GalleryData> {
  console.log('[DEBUG] getGalleryData called - reading from Supabase')
  try {
    const { data: artworks, error } = await supabase
      .from('artworks')
      .select('*')
      .order('order', { ascending: true })

    if (error) {
      console.log('[DEBUG] Supabase error:', error)
      return { artworks: [], works: [], cps: [] }
    }

    console.log('[DEBUG] Fetched from Supabase, artworks:', artworks?.length || 0)

    // 从 artworks 中动态生成 works 和 cps 列表
    const worksMap = new Map<string, Work>()
    const cpsMap = new Map<string, CP>()

    artworks?.forEach((artwork: any) => {
      artwork.works.forEach((w: string) => {
        if (!worksMap.has(w)) {
          worksMap.set(w, { slug: toSlug(w), name: w })
        }
      })
      artwork.cps.forEach((c: string) => {
        if (!cpsMap.has(c)) {
          cpsMap.set(c, { slug: toSlug(c), name: c })
        }
      })
    })

    return {
      artworks: artworks || [],
      works: Array.from(worksMap.values()),
      cps: Array.from(cpsMap.values())
    }
  } catch (e) {
    console.log('[DEBUG] Error:', e)
    return { artworks: [], works: [], cps: [] }
  }
}

export interface Settings {
  coverArtworkId?: string
}

export async function getSettings(): Promise<Settings> {
  try {
    const response = await fetch(`${OSS_BASE}/fanart-gallery/settings.json`)
    if (!response.ok) return {}
    return await response.json()
  } catch {
    return {}
  }
}

// 按 order 排序获取所有作品
export async function getArtworks(): Promise<Artwork[]> {
  const data = await getGalleryData()
  return data.artworks.sort((a, b) => a.order - b.order)
}

// 搜索作品
export function searchArtworks(data: GalleryData, query: string): Artwork[] {
  if (!query.trim()) return data.artworks.sort((a, b) => a.order - b.order)

  const q = query.toLowerCase()
  return data.artworks
    .filter(a =>
      a.title.toLowerCase().includes(q) ||
      a.works.some(w => w.toLowerCase().includes(q)) ||
      a.cps.some(c => c.toLowerCase().includes(q)) ||
      a.tags.some(t => t.toLowerCase().includes(q))
    )
    .sort((a, b) => a.order - b.order)
}

// 按作品筛选
export function filterByWork(data: GalleryData, workSlug: string): Artwork[] {
  return data.artworks
    .filter(a => a.works.some(w => toSlug(w) === workSlug))
    .sort((a, b) => a.order - b.order)
}

// 按CP筛选
export function filterByCP(data: GalleryData, cpSlug: string): Artwork[] {
  return data.artworks
    .filter(a => a.cps.some(c => toSlug(c) === cpSlug))
    .sort((a, b) => a.order - b.order)
}

// 生成 slug
export function toSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[×x]/g, '-')
}

// 从 slug 还原名称
export function fromSlug(slug: string): string {
  return slug.replace(/-/g, ' ')
}