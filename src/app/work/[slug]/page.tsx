import { getGalleryData, filterByWork, toSlug } from '@/lib/data'
import FilterPanel from '@/components/FilterPanel'
import HomeClient from '../../HomeClient'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

interface Props {
  params: { slug: string }
}

export async function generateStaticParams() {
  const data = await getGalleryData()
  return data.works.map(w => ({ slug: w.slug }))
}

export default async function WorkPage({ params }: Props) {
  const data = await getGalleryData()
  const artworks = filterByWork(data, params.slug)

  const workName = data.works.find(w => w.slug === params.slug)?.name || params.slug

  const workItems = data.works.map(w => ({
    slug: w.slug,
    name: w.name,
    count: data.artworks.filter(a => a.works.includes(w.name)).length
  }))

  return (
    <div className={styles.page}>
      <aside className={styles.sidebar}>
        <FilterPanel title="作品" items={workItems} basePath="/work" />
      </aside>
      <div className={styles.main}>
        <h1 className={styles.title}>{workName}</h1>
        <HomeClient data={{ ...data, artworks }} />
      </div>
    </div>
  )
}