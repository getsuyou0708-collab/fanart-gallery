'use client'

import { useState, useEffect } from 'react'
import { GalleryData, Artwork } from '@/lib/types'
import ImageGrid from '@/components/ImageGrid'
import SearchBar from '@/components/SearchBar'
import { useEditor } from '@/contexts/EditorContext'
import styles from './page.module.css'

const OSS_BASE = 'https://xiaoxiao0708.oss-cn-shanghai.aliyuncs.com'

function getImageUrl(filename: string): string {
  if (filename.startsWith('http')) return filename
  return `${OSS_BASE}/${filename}`
}

interface Props {
  data: GalleryData
  coverArtworkId?: string
}

export default function HomeClient({ data, coverArtworkId }: Props) {
  const { isUnlocked } = useEditor()
  const [showCover, setShowCover] = useState(false)
  const [coverFading, setCoverFading] = useState(false)
  const [selectedWork, setSelectedWork] = useState<string | null>(null)
  const [selectedCP, setSelectedCP] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [orderedIds, setOrderedIds] = useState<string[]>([])

  useEffect(() => {
    if (coverArtworkId && !isUnlocked) {
      setShowCover(true)
    }
  }, [coverArtworkId, isUnlocked])

  useEffect(() => {
    const ids = [...data.artworks]
      .sort((a, b) => a.order - b.order)
      .map(a => a.id)
    setOrderedIds(ids)
  }, [data.artworks])

  // 封面图片
  const coverArtwork = coverArtworkId
    ? data.artworks.find(a => a.id === coverArtworkId)
    : null

  // 选中作品时，获取该作品下的所有CP
  const workCPs = selectedWork
    ? data.artworks
        .filter(a => a.works.includes(selectedWork))
        .flatMap(a => a.cps)
        .filter((cp, idx, arr) => arr.indexOf(cp) === idx)
    : []

  const workCounts = data.works.map(w => ({
    ...w,
    count: data.artworks.filter(a => a.works.includes(w.name)).length
  }))

  const getOrderedArtworks = () => {
    const sorted = [...data.artworks].sort((a, b) => {
      const aIdx = orderedIds.indexOf(a.id)
      const bIdx = orderedIds.indexOf(b.id)
      if (aIdx === -1 && bIdx === -1) return a.order - b.order
      if (aIdx === -1) return 1
      if (bIdx === -1) return -1
      return aIdx - bIdx
    })
    return sorted
  }

  const filteredArtworks = getOrderedArtworks().filter(a => {
    const matchesSearch = searchQuery
      ? a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.works.some(w => w.toLowerCase().includes(searchQuery.toLowerCase())) ||
        a.cps.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()))
      : true

    const matchesWork = selectedWork ? a.works.includes(selectedWork) : true
    const matchesCP = selectedCP ? a.cps.includes(selectedCP) : true

    return matchesSearch && matchesWork && matchesCP
  })

  const handleReorder = async (reordered: Artwork[]) => {
    const newOrder = reordered.map(a => a.id)
    setOrderedIds(newOrder)

    try {
      await fetch('/api/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artworks: reordered })
      })
    } catch (e) {
      console.error('Failed to save order:', e)
    }
  }

  // 显示封面
  if (showCover && coverArtwork) {
    return (
      <div
        className={`${styles.coverPage} ${coverFading ? styles.fadeOut : ''}`}
        onClick={() => {
          if (!coverFading) setCoverFading(true)
          setTimeout(() => setShowCover(false), 600)
        }}
      >
        <img
          src={getImageUrl(coverArtwork.filename)}
          alt={coverArtwork.title}
          className={styles.coverImage}
        />
        <div className={styles.coverHint}>点击进入作品展示</div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarSection}>
          <h3 className={styles.sidebarTitle}>✿ 作品</h3>
          <div className={styles.workList}>
            <button
              className={`${styles.workItem} ${selectedWork === null ? styles.active : ''}`}
              onClick={() => {
                setSelectedWork(null)
                setSelectedCP(null)
              }}
            >
              <span>全部作品</span>
              <span className={styles.count}>{data.artworks.length}</span>
            </button>
            {workCounts.map(work => (
              <button
                key={work.slug}
                className={`${styles.workItem} ${selectedWork === work.name ? styles.active : ''}`}
                onClick={() => {
                  setSelectedWork(work.name)
                  setSelectedCP(null)
                }}
              >
                <span>{work.name}</span>
                <span className={styles.count}>{work.count}</span>
              </button>
            ))}
          </div>
        </div>
      </aside>

      <main className={styles.main}>
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <h1 className={styles.pageTitle}>
              {selectedWork ? selectedWork : '森見月下'}
            </h1>
            {selectedWork && workCPs.length > 0 && (
              <div className={styles.cpTags}>
                {workCPs.map(cp => (
                  <button
                    key={cp}
                    className={`${styles.cpTag} ${selectedCP === cp ? styles.active : ''}`}
                    onClick={() => setSelectedCP(selectedCP === cp ? null : cp)}
                  >
                    {cp}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        {isUnlocked && selectedWork === null && !searchQuery && (
          <p className={styles.hint}>✧ 拖拽图片可调整顺序</p>
        )}
        {selectedCP && (
          <p className={styles.hint}>筛选: {selectedCP} <button className={styles.clearFilter} onClick={() => setSelectedCP(null)}>✕</button></p>
        )}
        <ImageGrid artworks={filteredArtworks} onReorder={isUnlocked ? handleReorder : undefined} />
      </main>

      <div className={styles.searchFixed}>
        <SearchBar onSearch={setSearchQuery} placeholder="搜索 ✧" />
      </div>
    </div>
  )
}