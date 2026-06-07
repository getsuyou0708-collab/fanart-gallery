export interface Artwork {
  id: string
  title: string
  filename: string
  type: 'image' | 'video'
  thumbnail?: string
  works: string[]      // 作品名列表
  cps: string[]        // CP名列表
  tags: string[]
  order: number
  createdAt: string
  groupId?: string     // 同批上传的图片共享同一个 groupId
}

export interface Work {
  slug: string
  name: string
}

export interface CP {
  slug: string
  name: string
}

export interface GalleryData {
  artworks: Artwork[]
  works: Work[]
  cps: CP[]
}