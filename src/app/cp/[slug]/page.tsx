import { getGalleryData, filterByCP } from '@/lib/data'
import FilterPanel from '@/components/FilterPanel'
import HomeClient from '../../HomeClient'
import styles from '@/app/work/[slug]/page.module.css'

export const dynamic = 'force-dynamic'

interface Props {
  params: { slug: string }
}

export async function generateStaticParams() {
  const data = await getGalleryData()
  return data.cps.map(c => ({ slug: c.slug }))
}

export default async function CPPage({ params }: Props) {
  const data = await getGalleryData()
  const artworks = filterByCP(data, params.slug)

  const cpName = data.cps.find(c => c.slug === params.slug)?.name || params.slug

  const cpItems = data.cps.map(c => ({
    slug: c.slug,
    name: c.name,
    count: data.artworks.filter(a => a.cps.includes(c.slug)).length
  }))

  return (
    <div className={styles.page}>
      <aside className={styles.sidebar}>
        <FilterPanel title="CP" items={cpItems} basePath="/cp" />
      </aside>
      <div className={styles.main}>
        <h1 className={styles.title}>{cpName}</h1>
        <HomeClient data={{ ...data, artworks }} />
      </div>
    </div>
  )
}