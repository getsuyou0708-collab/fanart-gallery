import { getGalleryData } from '@/lib/data'
import ManageClient from './ManageClient'

// 强制动态渲染，每次请求时重新获取数据
export const dynamic = 'force-dynamic'

export default async function ManagePage() {
  const data = await getGalleryData()
  return <ManageClient artworks={data.artworks} />
}