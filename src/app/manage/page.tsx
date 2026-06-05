import { getGalleryData } from '@/lib/data'
import ManageClient from './ManageClient'

export default async function ManagePage() {
  const data = await getGalleryData()
  return <ManageClient artworks={data.artworks} />
}