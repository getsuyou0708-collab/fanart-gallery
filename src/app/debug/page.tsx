import { getGalleryData } from '@/lib/data'
import styles from '../page.module.css'

export default async function DebugPage() {
  const data = await getGalleryData()
  return (
    <div className={styles.page} style={{ padding: '20px' }}>
      <h1>Debug Data</h1>
      <p>Artworks count: {data.artworks.length}</p>
      <pre>{JSON.stringify(data.artworks, null, 2)}</pre>
    </div>
  )
}