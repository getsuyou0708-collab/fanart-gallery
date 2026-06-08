'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Artwork } from '@/lib/types'
import { getArtworks } from '@/lib/data'
import { supabase } from '@/lib/supabase'
import { useEditor } from '@/contexts/EditorContext'
import styles from './page.module.css'

const OSS_BASE = 'https://xiaoxiao0708.oss-cn-shanghai.aliyuncs.com'

function getImageUrl(filename: string): string {
  if (filename.startsWith('http')) return filename
  return `${OSS_BASE}/${filename}`
}

// 可排序的图片项组件
function SortableImage({ img, onClick }: { img: Artwork; onClick: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: img.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={styles.imageItem}
      {...attributes}
      {...listeners}
      onClick={onClick}
    >
      <img src={getImageUrl(img.filename)} alt={img.title} />
    </div>
  )
}

export default function ArtworkDetailPage() {
  const router = useRouter()
  const params = useParams()
  const artworkId = params.id as string
  const { isUnlocked } = useEditor()

  const [artwork, setArtwork] = useState<Artwork | null>(null)
  const [allArtworks, setAllArtworks] = useState<Artwork[]>([])
  const [groupImages, setGroupImages] = useState<Artwork[]>([])
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [saveError, setSaveError] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // 获取当前作品和所有作品
  useEffect(() => {
    async function loadData() {
      const artworks = await getArtworks()
      setAllArtworks(artworks)

      const current = artworks.find(a => a.id === artworkId)
      if (current) {
        setArtwork(current)

        // 如果有 groupId，获取同组的所有图片
        if (current.groupId) {
          const group = artworks.filter(a => a.groupId === current.groupId)
          group.sort((a, b) => a.order - b.order)
          setGroupImages(group)
        } else {
          setGroupImages([current])
        }
      }
      setIsLoading(false)
    }
    loadData()
  }, [artworkId])

  // 计算当前作品在列表中的索引
  const currentIndex = allArtworks.findIndex(a => a.id === artworkId)
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < allArtworks.length - 1

  // 导航到上一个/下一个作品
  const goToPrevArtwork = useCallback(() => {
    const idx = allArtworks.findIndex(a => a.id === artworkId)
    if (idx > 0) {
      setIsLightboxOpen(false)
      router.push(`/artwork/${allArtworks[idx - 1].id}`)
    }
  }, [allArtworks, artworkId, router])

  const goToNextArtwork = useCallback(() => {
    const idx = allArtworks.findIndex(a => a.id === artworkId)
    if (idx >= 0 && idx < allArtworks.length - 1) {
      setIsLightboxOpen(false)
      router.push(`/artwork/${allArtworks[idx + 1].id}`)
    }
  }, [allArtworks, artworkId, router])

  // 灯箱内切换图片
  const goToPrevImage = useCallback(() => {
    if (lightboxIndex > 0) {
      setLightboxIndex(prev => prev - 1)
    }
  }, [lightboxIndex])

  const goToNextImage = useCallback(() => {
    if (lightboxIndex < groupImages.length - 1) {
      setLightboxIndex(prev => prev + 1)
    }
  }, [lightboxIndex, groupImages.length])

  // 拖拽结束处理
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const oldIndex = groupImages.findIndex(img => img.id === active.id)
    const newIndex = groupImages.findIndex(img => img.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    // 立即更新 UI
    const newOrder = arrayMove(groupImages, oldIndex, newIndex)
    setGroupImages(newOrder)
    setLightboxIndex(newIndex)

    // 保存到数据库
    try {
      const updates = newOrder.map((img, index) => ({
        id: img.id,
        order: index + 1,
      }))

      const { error } = await supabase
        .from('artworks')
        .upsert(updates.map(u => ({ id: u.id, order: u.order })))

      if (error) {
        console.error('Failed to save order:', error)
        setSaveError('顺序保存失败，请刷新页面')
        setTimeout(() => setSaveError(null), 3000)
      }
    } catch (e) {
      console.error('Failed to save order:', e)
      setSaveError('顺序保存失败，请刷新页面')
      setTimeout(() => setSaveError(null), 3000)
    }
  }

  // 键盘导航
  useEffect(() => {
    if (!artwork) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const idx = allArtworks.findIndex(a => a.id === artworkId)
      if (isLightboxOpen) {
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          if (lightboxIndex > 0) {
            setLightboxIndex(prev => prev - 1)
          }
        } else if (e.key === 'ArrowDown') {
          e.preventDefault()
          if (lightboxIndex < groupImages.length - 1) {
            setLightboxIndex(prev => prev + 1)
          }
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault()
          if (idx > 0) {
            setIsLightboxOpen(false)
            router.push(`/artwork/${allArtworks[idx - 1].id}`)
          }
        } else if (e.key === 'ArrowRight') {
          e.preventDefault()
          if (idx >= 0 && idx < allArtworks.length - 1) {
            setIsLightboxOpen(false)
            router.push(`/artwork/${allArtworks[idx + 1].id}`)
          }
        } else if (e.key === 'Escape') {
          setIsLightboxOpen(false)
        }
      } else {
        if (e.key === 'ArrowLeft') {
          e.preventDefault()
          if (idx > 0) {
            router.push(`/artwork/${allArtworks[idx - 1].id}`)
          }
        } else if (e.key === 'ArrowRight') {
          e.preventDefault()
          if (idx >= 0 && idx < allArtworks.length - 1) {
            router.push(`/artwork/${allArtworks[idx + 1].id}`)
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [artwork, isLightboxOpen, lightboxIndex, groupImages.length, allArtworks, artworkId, router])

  const openLightbox = (index: number) => {
    setLightboxIndex(index)
    setIsLightboxOpen(true)
  }

  const closeLightbox = () => {
    setIsLightboxOpen(false)
  }

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>加载中...</div>
      </div>
    )
  }

  if (!artwork) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>作品不存在</div>
      </div>
    )
  }

  const currentImage = groupImages[lightboxIndex]
  const canNavigatePrevImage = lightboxIndex > 0
  const canNavigateNextImage = lightboxIndex < groupImages.length - 1

  return (
    <div className={styles.container}>
      {/* 保存失败提示 */}
      {saveError && (
        <div className={styles.saveError}>{saveError}</div>
      )}

      {/* 顶部导航 */}
      <div className={styles.header}>
        <button
          className={`${styles.navBtn} ${!hasPrev ? styles.disabled : ''}`}
          onClick={goToPrevArtwork}
          disabled={!hasPrev}
        >
          ← 上一个
        </button>
        <h1 className={styles.title}>{artwork.title}</h1>
        <button
          className={`${styles.navBtn} ${!hasNext ? styles.disabled : ''}`}
          onClick={goToNextArtwork}
          disabled={!hasNext}
        >
          下一个 →
        </button>
      </div>

      {/* 图片网格 - 可拖拽排序 */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={groupImages.map(img => img.id)}
          strategy={horizontalListSortingStrategy}
        >
          <div className={styles.imageGrid}>
            {groupImages.map((img, index) => (
              <SortableImage
                key={img.id}
                img={img}
                onClick={() => openLightbox(index)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* 拖拽提示 */}
      {isUnlocked && groupImages.length > 1 && (
        <div className={styles.dragHint}>
          💡 拖拽图片可以调整顺序
        </div>
      )}

      {/* 图片计数器 */}
      {groupImages.length > 1 && (
        <div className={styles.imageCounter}>
          共 {groupImages.length} 张图片
        </div>
      )}

      {/* 作品信息 */}
      <div className={styles.info}>
        {artwork.works.length > 0 && (
          <div className={styles.tags}>
            {artwork.works.map(w => (
              <span key={w} className={styles.tagWork}>{w}</span>
            ))}
          </div>
        )}
        {artwork.cps.length > 0 && (
          <div className={styles.tags}>
            {artwork.cps.map(c => (
              <span key={c} className={styles.tagCp}>{c}</span>
            ))}
          </div>
        )}
      </div>

      {/* 灯箱 */}
      {isLightboxOpen && currentImage && (
        <div className={styles.lightbox} onClick={closeLightbox}>
          <img
            src={getImageUrl(currentImage.filename)}
            alt={currentImage.title}
            className={styles.lightboxImage}
            onClick={e => e.stopPropagation()}
          />
          <button className={styles.lightboxClose} onClick={closeLightbox}>✕</button>

          {/* 左右箭头 - 切换作品 */}
          {hasPrev && (
            <button
              className={styles.lightboxPrevArtwork}
              onClick={e => { e.stopPropagation(); goToPrevArtwork() }}
            >❮</button>
          )}
          {hasNext && (
            <button
              className={styles.lightboxNextArtwork}
              onClick={e => { e.stopPropagation(); goToNextArtwork() }}
            >❯</button>
          )}

          {/* 图片指示器 */}
          {groupImages.length > 1 && (
            <>
              <div className={styles.lightboxCounter}>
                {lightboxIndex + 1} / {groupImages.length}
              </div>
              {/* 上下箭头 - 切换图片 */}
              {canNavigatePrevImage && (
                <button
                  className={styles.lightboxPrevImage}
                  onClick={e => { e.stopPropagation(); goToPrevImage() }}
                >▲</button>
              )}
              {canNavigateNextImage && (
                <button
                  className={styles.lightboxNextImage}
                  onClick={e => { e.stopPropagation(); goToNextImage() }}
                >▼</button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}