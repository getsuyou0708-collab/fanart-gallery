'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './FilterPanel.module.css'

interface FilterItem {
  slug: string
  name: string
  count: number
}

interface Props {
  title: string
  items: FilterItem[]
  basePath: string
}

export default function FilterPanel({ title, items, basePath }: Props) {
  const pathname = usePathname()
  const currentSlug = pathname.split('/').pop() || ''

  if (items.length === 0) return null

  return (
    <div className={styles.panel}>
      <h3 className={styles.title}>{title}</h3>
      <div className={styles.list}>
        <Link
          href={basePath}
          className={`${styles.item} ${!currentSlug || currentSlug === basePath.split('/').pop() ? styles.active : ''}`}
        >
          全部
          <span className={styles.count}>
            {items.reduce((sum, i) => sum + i.count, 0)}
          </span>
        </Link>
        {items.map(item => (
          <Link
            key={item.slug}
            href={`${basePath}/${item.slug}`}
            className={`${styles.item} ${currentSlug === item.slug ? styles.active : ''}`}
          >
            <span className={styles.name}>{item.name}</span>
            <span className={styles.count}>{item.count}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}