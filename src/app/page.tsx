import { getGalleryData, getSettings } from '@/lib/data'
import HomeClient from './HomeClient'

// 强制动态渲染，每次请求时重新获取数据
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const data = await getGalleryData()
  const settings = await getSettings()
  return <HomeClient data={data} coverArtworkId={settings.coverArtworkId} />
}