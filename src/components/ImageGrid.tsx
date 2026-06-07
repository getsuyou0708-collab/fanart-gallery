'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Artwork } from '@/lib/types'
import MediaCard from './MediaCard'
import { useEditor } from '@/contexts/EditorContext'
import styles from './ImageGrid.module.css'

interface Props {
  artworks: Artwork[]
  onReorder?: (artworks: Artwork[]) => void
}

// 按 groupId 分组，返回卡片列表
function groupArtworks(artworks: Artwork[]): Artwork[] {
  const grouped: Map<string, Artwork[]> = new Map()
  const standalone: Artwork[] = []

  artworks.forEach(a => {
    if (a.groupId) {
      if (!grouped.has(a.groupId)) grouped.set(a.groupId, [])
      grouped.get(a.groupId)!.push(a)
    } else {
      standalone.push(a)
    }
  })

  // 把同组的按 order 排序，只取第一个作为代表
  const groupCards: Artwork[] = []
  grouped.forEach(group => {
    group.sort((a, b) => a.order - b.order)
    const first = { ...group[0], groupSize: group.length, groupItems: group }
    groupCards.push(first as Artwork)
  })

  // 合并：先放独立作品，再放分组（都按 order 排序）
  const allCards = [...standalone, ...groupCards]
  return allCards.sort((a, b) => a.order - b.order)
}

export default function ImageGrid({ artworks, onReorder }: Props) {
  const { isUnlocked } = useEditor()
  const [items, setItems] = useState<Artwork[]>([])
  const [flatItems, setFlatItems] = useState<Artwork[]>([])
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [lightboxGroup, setLightboxGroup] = useState<Artwork[] | null>(null)
  const [lightboxGroupIndex, setLightboxGroupIndex] = useState<number>(0)
  const draggedId = useRef<string | null>(null)

  useEffect(() => {
    const grouped = groupArtworks(artworks)
    setItems(grouped)
    setFlatItems(artworks.sort((a, b) => a.order - b.order))
  }, [artworks])

  // 键盘导航
  useEffect(() => {
    if (lightboxIndex === null && lightboxGroup === null) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxGroup) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault()
          setLightboxGroupIndex(prev => (prev + 1) % lightboxGroup.length)
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault()
          setLightboxGroupIndex(prev => (prev - 1 + lightboxGroup.length) % lightboxGroup.length)
        } else if (e.key === 'Escape') {
          setLightboxGroup(null)
          setLightboxGroupIndex(0)
        }
      } else if (lightboxIndex !== null) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault()
          setLightboxIndex(prev => prev !== null ? (prev + 1) % flatItems.length : 0)
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault()
          setLightboxIndex(prev => prev !== null ? (prev - 1 + flatItems.length) % flatItems.length : flatItems.length - 1)
        } else if (e.key === 'Escape') {
          setLightboxIndex(null)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lightboxIndex, lightboxGroup, lightboxGroupIndex, flatItems.length])

  if (items.length === 0) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>🌷</span>
        <p>暂无作品</p>
      </div>
    )
  }

  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (!isUnlocked) {
      e.preventDefault()
      return
    }
    draggedId.current = id
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, id: string) => {
    if (!isUnlocked) return
    e.preventDefault()
    if (draggedId.current === id) return
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!isUnlocked) return
    if (!draggedId.current || draggedId.current === targetId) {
      draggedId.current = null
      return
    }

    const newItems = [...items]
    const draggedIndex = newItems.findIndex(item => item.id === draggedId.current)
    const targetIndex = newItems.findIndex(item => item.id === targetId)

    if (draggedIndex === -1 || targetIndex === -1) return

    const [draggedItem] = newItems.splice(draggedIndex, 1)
    newItems.splice(targetIndex, 0, draggedItem)

    const reordered = newItems.map((item, index) => ({
      ...item,
      order: index + 1
    }))

    setItems(reordered)
    draggedId.current = null

    if (onReorder) {
      onReorder(reordered)
    }
  }

  const handleDragEnd = () => {
    draggedId.current = null
  }

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null)
    setLightboxGroup(null)
    setLightboxGroupIndex(0)
  }, [])

  const handleCardClick = (artwork: Artwork, index: number) => {
    if ((artwork as any).groupSize > 1) {
      // 点击的是分组，打开组内灯箱
      setLightboxGroup((artwork as any).groupItems)
      setLightboxGroupIndex(0)
    } else {
      // 单个作品
      setLightboxIndex(index)
    }
  }

  return (
    <>
      <div className={styles.grid}>
        {items.map((artwork, index) => (
          <div
            key={artwork.id}
            className={`${styles.item} ${draggedId.current === artwork.id ? styles.dragging : ''}`}
            style={{ animationDelay: `${index * 50}ms` }}
            draggable={isUnlocked}
            onDragStart={e => handleDragStart(e, artwork.id)}
            onDragOver={e => handleDragOver(e, artwork.id)}
            onDrop={e => handleDrop(e, artwork.id)}
            onDragEnd={handleDragEnd}
          >
            <MediaCard
              artwork={artwork}
              onClick={() => handleCardClick(artwork, index)}
              showDownload={isUnlocked}
            />
            {/* 分组数量指示 */}
            {(artwork as any).groupSize > 1 && (
              <div className={styles.groupBadge}>{(artwork as any).groupSize}</div>
            )}
          </div>
        ))}
      </div>

      {/* 单个作品灯箱 */}
      {lightboxIndex !== null && !lightboxGroup && (
        <Lightbox
          artwork={flatItems[lightboxIndex]}
          index={lightboxIndex}
          total={flatItems.length}
          onClose={closeLightbox}
          onPrev={() => setLightboxIndex(prev => prev !== null ? (prev - 1 + flatItems.length) % flatItems.length : 0)}
          onNext={() => setLightboxIndex(prev => prev !== null ? (prev + 1) % flatItems.length : 0)}
        />
      )}

      {/* 分组灯箱：竖排展示所有图片 */}
      {lightboxGroup && (
        <GroupLightbox
          items={lightboxGroup}
          currentIndex={lightboxGroupIndex}
          onClose={closeLightbox}
          onPrev={() => setLightboxGroupIndex(prev => (prev - 1 + lightboxGroup.length) % lightboxGroup.length)}
          onNext={() => setLightboxGroupIndex(prev => (prev + 1) % lightboxGroup.length)}
        />
      )}
    </>
  )
}

// 灯箱组件（单图）
function Lightbox({ artwork, index, total, onClose, onPrev, onNext }: {
  artwork: Artwork
  index: number
  total: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}) {
  return (
    <div className={styles.lightbox} onClick={onClose}>
      <img
        src={getImageUrl(artwork.filename)}
        alt={artwork.title}
        className={styles.lightboxImage}
      />
      <button className={styles.lightboxClose} onClick={onClose}>✕</button>
      {total > 1 && (
        <>
          <button className={styles.lightboxPrev} onClick={e => { e.stopPropagation(); onPrev() }}>❮</button>
          <button className={styles.lightboxNext} onClick={e => { e.stopPropagation(); onNext() }}>❯</button>
          <div className={styles.lightboxCounter}>{index + 1} / {total}</div>
        </>
      )}
      {(artwork.works.length > 0 || artwork.cps.length > 0) && (
        <div className={styles.lightboxTags} onClick={e => e.stopPropagation()}>
          {artwork.works.map(w => (
            <span key={w} className={styles.tagWork}>{w}</span>
          ))}
          {artwork.cps.map(c => (
            <span key={c} className={styles.tagCp}>{c}</span>
          ))}
        </div>
      )}
    </div>
  )
}

// 分组灯箱：竖排展示
function GroupLightbox({ items, currentIndex, onClose, onPrev, onNext }: {
  items: Artwork[]
  currentIndex: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}) {
  return (
    <div className={styles.lightbox} onClick={onClose}>
      <div className={styles.groupLightboxContent} onClick={e => e.stopPropagation()}>
        {items.map((item, idx) => (
          <img
            key={item.id}
            src={getImageUrl(item.filename)}
            alt={item.title}
            className={styles.groupLightboxImage}
            style={{ opacity: idx === currentIndex ? 1 : 0.3 }}
          />
        ))}
      </div>
      <button className={styles.lightboxClose} onClick={onClose}>✕</button>
      {items.length > 1 && (
        <>
          <button className={styles.lightboxPrev} onClick={e => { e.stopPropagation(); onPrev() }}>❮</button>
          <button className={styles.lightboxNext} onClick={e => { e.stopPropagation(); onNext() }}>❯</button>
          <div className={styles.lightboxCounter}>{currentIndex + 1} / {items.length}</div>
        </>
      )}
      {items[currentIndex] && (items[currentIndex].works.length > 0 || items[currentIndex].cps.length > 0) && (
        <div className={styles.lightboxTags} onClick={e => e.stopPropagation()}>
          {items[currentIndex].works.map(w => (
            <span key={w} className={styles.tagWork}>{w}</span>
          ))}
          {items[currentIndex].cps.map(c => (
            <span key={c} className={styles.tagCp}>{c}</span>
          ))}
        </div>
      )}
    </div>
  )
}

const OSS_BASE = 'https://xiaoxiao0708.oss-cn-shanghai.aliyuncs.com'

function getImageUrl(filename: string): string {
  if (filename.startsWith('http')) return filename
  return `${OSS_BASE}/${filename}`
}