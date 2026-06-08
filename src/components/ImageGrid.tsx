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

// 卡片类型：要么是单个作品，要么是一个组
interface GridItem {
  type: 'single' | 'group'
  // single
  artwork?: Artwork
  // group
  groupId?: string
  groupSize?: number
  groupItems?: Artwork[]
  // 共用
  order: number
}

// 把 artworks 按 groupId 分组，返回网格项（按 order 排序）
function buildGridItems(artworks: Artwork[]): GridItem[] {
  const sorted = [...artworks].sort((a, b) => a.order - b.order)

  // 收集所有 groupId 的组
  const groups: Map<string, Artwork[]> = new Map()
  const singles: Artwork[] = []

  sorted.forEach(a => {
    if (a.groupId) {
      if (!groups.has(a.groupId)) groups.set(a.groupId, [])
      groups.get(a.groupId)!.push(a)
    } else {
      singles.push(a)
    }
  })

  const items: GridItem[] = singles.map(a => ({ type: 'single', artwork: a, order: a.order }))

  groups.forEach(group => {
    group.sort((a, b) => a.order - b.order)
    items.push({
      type: 'group',
      groupId: group[0].groupId,
      groupSize: group.length,
      groupItems: group,
      order: group[0].order
    })
  })

  return items.sort((a, b) => a.order - b.order)
}

export default function ImageGrid({ artworks, onReorder }: Props) {
  const { isUnlocked } = useEditor()
  const [gridItems, setGridItems] = useState<GridItem[]>([])
  // flatItems 用于灯箱导航（所有作品扁平列表）
  const [flatItems, setFlatItems] = useState<Artwork[]>([])

  const [lightboxArtwork, setLightboxArtwork] = useState<Artwork | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number>(0)
  const [lightboxTotal, setLightboxTotal] = useState<number>(0)

  // 分组灯箱
  const [groupItems, setGroupItems] = useState<Artwork[]>([])
  const [groupIndex, setGroupIndex] = useState<number>(0)

  const draggedId = useRef<string | null>(null)

  useEffect(() => {
    const items = buildGridItems(artworks)
    setGridItems(items)
    setFlatItems([...artworks].sort((a, b) => a.order - b.order))
  }, [artworks])

  // 导航函数（不循环）
  const canNavigatePrev = lightboxIndex > 0
  const canNavigateNext = lightboxIndex < flatItems.length - 1
  const canGroupNavigatePrev = groupIndex > 0
  const canGroupNavigateNext = groupIndex < groupItems.length - 1

  const goToPrev = useCallback(() => {
    if (canNavigatePrev) setLightboxIndex(prev => prev - 1)
  }, [canNavigatePrev])

  const goToNext = useCallback(() => {
    if (canNavigateNext) setLightboxIndex(prev => prev + 1)
  }, [canNavigateNext])

  const goToGroupPrev = useCallback(() => {
    if (canGroupNavigatePrev) setGroupIndex(prev => prev - 1)
  }, [canGroupNavigatePrev])

  const goToGroupNext = useCallback(() => {
    if (canGroupNavigateNext) setGroupIndex(prev => prev + 1)
  }, [canGroupNavigateNext])

  // 键盘导航
  // ← / → 箭头：切换上一个/下一个作品
  // ↑ / ↓ 箭头：仅在分组灯箱中切换图片
  useEffect(() => {
    const hasLightbox = lightboxArtwork !== null || groupItems.length > 0
    if (!hasLightbox) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // 左/右箭头：切换作品
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        if (lightboxIndex > 0) {
          const prevArtwork = flatItems[lightboxIndex - 1]
          setLightboxArtwork(prevArtwork)
          setLightboxIndex(lightboxIndex - 1)
          // 如果是分组作品，打开分组灯箱
          if (prevArtwork.groupId) {
            const group = flatItems.filter(a => a.groupId === prevArtwork.groupId)
            group.sort((a, b) => a.order - b.order)
            setGroupItems(group)
            setGroupIndex(0)
          } else {
            setGroupItems([])
          }
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        if (lightboxIndex < flatItems.length - 1) {
          const nextArtwork = flatItems[lightboxIndex + 1]
          setLightboxArtwork(nextArtwork)
          setLightboxIndex(lightboxIndex + 1)
          // 如果是分组作品，打开分组灯箱
          if (nextArtwork.groupId) {
            const group = flatItems.filter(a => a.groupId === nextArtwork.groupId)
            group.sort((a, b) => a.order - b.order)
            setGroupItems(group)
            setGroupIndex(0)
          } else {
            setGroupItems([])
          }
        }
      }
      // 上/下箭头：仅在分组灯箱中切换图片
      else if (groupItems.length > 0) {
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          if (groupIndex > 0) setGroupIndex(prev => prev - 1)
        } else if (e.key === 'ArrowDown') {
          e.preventDefault()
          if (groupIndex < groupItems.length - 1) setGroupIndex(prev => prev + 1)
        } else if (e.key === 'Escape') {
          setGroupItems([])
          setGroupIndex(0)
        }
      } else if (e.key === 'Escape') {
        setLightboxArtwork(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lightboxArtwork, groupItems, lightboxIndex, flatItems])

  if (gridItems.length === 0) {
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

    const newItems = [...gridItems]
    const draggedIdx = newItems.findIndex(item => item.groupId ? item.groupId === draggedId.current : item.artwork?.id === draggedId.current)
    const targetIdx = newItems.findIndex(item => item.groupId ? item.groupId === targetId : item.artwork?.id === targetId)

    if (draggedIdx === -1 || targetIdx === -1) return

    const [draggedItem] = newItems.splice(draggedIdx, 1)
    newItems.splice(targetIdx, 0, draggedItem)

    // 更新 order
    const reordered = newItems.map((item, index) => ({ ...item, order: index + 1 }))
    setGridItems(reordered)

    draggedId.current = null

    if (onReorder) {
      const flat = reordered.flatMap(item =>
        item.type === 'single' ? [item.artwork!] : item.groupItems!
      )
      onReorder(flat.map((a, i) => ({ ...a, order: i + 1 })))
    }
  }

  const handleDragEnd = () => {
    draggedId.current = null
  }

  const closeLightbox = () => {
    setLightboxArtwork(null)
    setGroupItems([])
    setGroupIndex(0)
  }

  const handleCardClick = (item: GridItem, idx: number) => {
    if (item.type === 'group' && item.groupItems) {
      setGroupItems(item.groupItems)
      setGroupIndex(0)
    } else if (item.type === 'single' && item.artwork) {
      const flatIdx = flatItems.findIndex(a => a.id === item.artwork!.id)
      setLightboxArtwork(item.artwork)
      setLightboxIndex(flatIdx >= 0 ? flatIdx : 0)
      setLightboxTotal(flatItems.length)
    }
  }

  const getItemId = (item: GridItem): string => {
    return item.type === 'group' ? (item.groupId || '') : (item.artwork?.id || '')
  }

  return (
    <>
      <div className={styles.grid}>
        {gridItems.map((item, index) => {
          const itemId = getItemId(item)
          return (
            <div
              key={itemId || index}
              className={`${styles.item} ${draggedId.current === itemId ? styles.dragging : ''}`}
              style={{ animationDelay: `${index * 50}ms` }}
              draggable={isUnlocked}
              onDragStart={e => handleDragStart(e, itemId)}
              onDragOver={e => handleDragOver(e, itemId)}
              onDrop={e => handleDrop(e, itemId)}
              onDragEnd={handleDragEnd}
            >
              <MediaCard
                artwork={item.type === 'single' ? item.artwork! : item.groupItems![0]}
                onClick={() => handleCardClick(item, index)}
                showDownload={isUnlocked}
              />
              {item.type === 'group' && item.groupSize && item.groupSize > 1 && (
                <div className={styles.groupBadge}>{item.groupSize}</div>
              )}
            </div>
          )
        })}
      </div>

      {/* 单图灯箱 */}
      {lightboxArtwork && groupItems.length === 0 && (
        <Lightbox
          artwork={lightboxArtwork}
          index={lightboxIndex}
          total={flatItems.length}
          onClose={closeLightbox}
          onPrev={goToPrev}
          onNext={goToNext}
          canPrev={canNavigatePrev}
          canNext={canNavigateNext}
        />
      )}

      {/* 分组灯箱 */}
      {groupItems.length > 0 && (
        <GroupLightbox
          items={groupItems}
          currentIndex={groupIndex}
          onClose={closeLightbox}
          onPrev={goToGroupPrev}
          onNext={goToGroupNext}
          canPrev={canGroupNavigatePrev}
          canNext={canGroupNavigateNext}
        />
      )}
    </>
  )
}

function Lightbox({ artwork, index, total, onClose, onPrev, onNext, canPrev, canNext }: {
  artwork: Artwork
  index: number
  total: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
  canPrev: boolean
  canNext: boolean
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
          <button
            className={`${styles.lightboxPrev} ${!canPrev ? styles.disabled : ''}`}
            onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onPrev() }}
            disabled={!canPrev}
          >❮</button>
          <button
            className={`${styles.lightboxNext} ${!canNext ? styles.disabled : ''}`}
            onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onNext() }}
            disabled={!canNext}
          >❯</button>
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

function GroupLightbox({ items, currentIndex, onClose, onPrev, onNext, canPrev, canNext }: {
  items: Artwork[]
  currentIndex: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
  canPrev: boolean
  canNext: boolean
}) {
  const currentItem = items[currentIndex]
  const touchStartY = useRef<number | null>(null)
  const touchStartX = useRef<number | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)

  if (!currentItem) return null

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null || touchStartX.current === null) return

    const deltaY = e.changedTouches[0].clientY - touchStartY.current
    const deltaX = e.changedTouches[0].clientX - touchStartX.current

    // 判断是垂直滑动还是水平滑动
    const absDeltaY = Math.abs(deltaY)
    const absDeltaX = Math.abs(deltaX)

    // 垂直滑动距离超过水平滑动，且距离超过50px
    if (absDeltaY > absDeltaX && absDeltaY > 50) {
      if (deltaY < 0 && canNext) {
        // 向上滑 -> 下一张
        e.stopPropagation()
        setIsTransitioning(true)
        setTimeout(() => {
          onNext()
          setIsTransitioning(false)
        }, 150)
      } else if (deltaY > 0 && canPrev) {
        // 向下滑 -> 上一张
        e.stopPropagation()
        setIsTransitioning(true)
        setTimeout(() => {
          onPrev()
          setIsTransitioning(false)
        }, 150)
      }
    }

    touchStartY.current = null
    touchStartX.current = null
  }

  return (
    <div
      className={styles.lightbox}
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className={styles.groupLightboxSingle} onClick={e => e.stopPropagation()}>
        <img
          src={getImageUrl(currentItem.filename)}
          alt={currentItem.title}
          className={`${styles.lightboxImage} ${isTransitioning ? styles.transitioning : ''}`}
        />
      </div>
      <button className={styles.lightboxClose} onClick={onClose}>✕</button>
      {items.length > 1 && (
        <>
          <button
            className={`${styles.lightboxPrev} ${!canPrev ? styles.disabled : ''}`}
            onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onPrev() }}
            disabled={!canPrev}
          >❮</button>
          <button
            className={`${styles.lightboxNext} ${!canNext ? styles.disabled : ''}`}
            onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onNext() }}
            disabled={!canNext}
          >❯</button>
          <div className={styles.lightboxCounter}>{currentIndex + 1} / {items.length}</div>
        </>
      )}
      {(currentItem.works.length > 0 || currentItem.cps.length > 0) && (
        <div className={styles.lightboxTags} onClick={e => e.stopPropagation()}>
          {currentItem.works.map(w => (
            <span key={w} className={styles.tagWork}>{w}</span>
          ))}
          {currentItem.cps.map(c => (
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