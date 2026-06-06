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
    if (coverArtworkId) {
      setShowCover(true)
    }
  }, [coverArtworkId])

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
            {workCounts.map((work, index) => (
              <div
                key={work.slug}
                className={`${styles.workItem} ${selectedWork === work.name ? styles.active : ''} ${isUnlocked ? styles.draggable : ''}`}
                draggable={isUnlocked}
                onDragStart={(e) => {
                  if (!isUnlocked) return
                  e.dataTransfer.setData('text/plain', work.name)
                  e.dataTransfer.effectAllowed = 'move'
                }}
                onDragOver={(e) => {
                  if (!isUnlocked) return
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                }}
                               onDrop={(e) => {
                  if (!isUnlocked) return
                  e.preventDefault()
                  const draggedWork = e.dataTransfer.getData('text/plain')
                  if (draggedWork === work.name) return

                  // 重新排序 works数组
                  const currentWorks = [...workCounts]
                  const draggedIndex = currentWorks.findIndex(w => w.name === draggedWork)
                  const dropIndex = currentWorks.findIndex(w => w.name === work.name)

                  if (draggedIndex !== -1 && dropIndex !== -1) {
                    const [removed] = currentWorks.splice(draggedIndex, 1)
                    currentWorks.splice(dropIndex, 0, removed)

                    // 为每个作品分配 order 值（同一作品的所有作品连续排序）
                    let orderCounter = 1
                    const workOrderMap = new Map<string, number>()
                    currentWorks.forEach((w, idx) => {
                      workOrderMap.set(w.name, idx + 1)
                    })

                    // 按作品顺序重排所有作品
                    const reorderedArtworks = [...data.artworks].sort((a, b) => {
                      // 先按作品顺序
                      const aWorkOrder = workOrderMap.get(a.works[0]) || 999
                      const bWorkOrder = workOrderMap.get(b.works[0]) || 999
                      if (aWorkOrder !== bWorkOrder) return aWorkOrder - bWorkOrder
                      // 同一作品内按原 order 排序
                      return a.order - b.order
                    })

                    // 分配新的连续 order
                    const finalArtworks = reorderedArtworks.map((a, idx) => ({
                      ...a,
                      order: idx + 1
                    }))

                    handleReorder(finalArtworks)
                  }
                }}
                onClick={() => {
                  setSelectedWork(work.name)
                  setSelectedCP(null)
                }}
              >
                <span>{work.name}</span>
                <span className={styles.count}>{work.count}</span>
              </div>
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