import { GalleryData, Artwork, Work, CP } from './types'
import fs from 'fs'
import path from 'path'

const DATA_PATH = path.join(process.cwd(), 'public', 'data', 'artworks.json')
const SETTINGS_PATH = path.join(process.cwd(), 'public', 'data', 'settings.json')

// 获取所有数据
export async function getGalleryData(): Promise<GalleryData> {
  console.log('[DEBUG] getGalleryData called, CWD:', process.cwd())
  console.log('[DEBUG] DATA_PATH:', DATA_PATH)
  console.log('[DEBUG] File exists:', fs.existsSync(DATA_PATH))
  try {
    const fileContent = fs.readFileSync(DATA_PATH, 'utf-8')
    console.log('[DEBUG] File read success, length:', fileContent.length)
    const raw = JSON.parse(fileContent)
    // 支持两种格式：{ artworks: [...] } 或直接是 [...]
    const artworks: Artwork[] = Array.isArray(raw) ? raw : (raw.artworks || [])
    console.log('[DEBUG] Parsed, artworks:', artworks.length)

  // 从 artworks 中动态生成 works 和 cps 列表
    const worksMap = new Map<string, Work>()
    const cpsMap = new Map<string, CP>()

    artworks.forEach((artwork: Artwork) => {
      artwork.works.forEach(w => {
        if (!worksMap.has(w)) {
          worksMap.set(w, { slug: toSlug(w), name: w })
        }
      })
      artwork.cps.forEach(c => {
        if (!cpsMap.has(c)) {
          cpsMap.set(c, { slug: toSlug(c), name: c })
        }
      })
    })

    return {
      artworks: artworks,
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
    const content = fs.readFileSync(SETTINGS_PATH, 'utf-8')
    return JSON.parse(content)
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