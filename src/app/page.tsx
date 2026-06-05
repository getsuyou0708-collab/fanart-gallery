import { getGalleryData, getSettings } from '@/lib/data'
import HomeClient from './HomeClient'

export default async function HomePage() {
  const data = await getGalleryData()
  const settings = await getSettings()
  return <HomeClient data={data} coverArtworkId={settings.coverArtworkId} />
}