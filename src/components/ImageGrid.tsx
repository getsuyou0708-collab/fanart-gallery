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

export default function ImageGrid({ artworks, onReorder }: Props) {
  const { isUnlocked } = useEditor()
  const [items, setItems] = useState(artworks)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const dragOverId = useRef<string | null>(null)

  useEffect(() => {
    setItems(artworks)
  }, [artworks])

  // 键盘导航
  useEffect(() => {
    if (lightboxIndex === null) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        setLightboxIndex(prev => prev !== null ? (prev + 1) % items.length : 0)
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        setLightboxIndex(prev => prev !== null ? (prev - 1 + items.length) % items.length : items.length - 1)
      } else if (e.key === 'Escape') {
        setLightboxIndex(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lightboxIndex, items.length])

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
    setDraggedId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, id: string) => {
    if (!isUnlocked) return
    e.preventDefault()
    if (draggedId === id) return
    dragOverId.current = id
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!isUnlocked) return
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null)
      return
    }

    const newItems = [...items]
    const draggedIndex = newItems.findIndex(item => item.id === draggedId)
    const targetIndex = newItems.findIndex(item => item.id === targetId)

    if (draggedIndex === -1 || targetIndex === -1) return

    const [draggedItem] = newItems.splice(draggedIndex, 1)
    newItems.splice(targetIndex, 0, draggedItem)

    const reordered = newItems.map((item, index) => ({
      ...item,
      order: index + 1
    }))

    setItems(reordered)
    setDraggedId(null)

    if (onReorder) {
      onReorder(reordered)
    }
  }

  const handleDragEnd = () => {
    setDraggedId(null)
    dragOverId.current = null
  }

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null)
  }, [])

  const currentArtwork = lightboxIndex !== null ? items[lightboxIndex] : null

  return (
    <>
      <div className={styles.grid}>
        {items.map((artwork, index) => (
          <div
            key={artwork.id}
            className={`${styles.item} ${draggedId === artwork.id ? styles.dragging : ''}`}
            style={{ animationDelay: `${index * 50}ms` }}
            draggable={isUnlocked}
            onDragStart={e => handleDragStart(e, artwork.id)}
            onDragOver={e => handleDragOver(e, artwork.id)}
            onDrop={e => handleDrop(e, artwork.id)}
            onDragEnd={handleDragEnd}
          >
            <MediaCard
              artwork={artwork}
              onClick={() => setLightboxIndex(index)}
              showDownload={isUnlocked}
            />
          </div>
        ))}
      </div>

      {/* 全局灯箱 */}
      {currentArtwork && (
        <Lightbox
          artwork={currentArtwork}
          index={lightboxIndex!}
          total={items.length}
          onClose={closeLightbox}
          onPrev={() => setLightboxIndex(prev => prev !== null ? (prev - 1 + items.length) % items.length : 0)}
          onNext={() => setLightboxIndex(prev => prev !== null ? (prev + 1) % items.length : 0)}
        />
      )}
    </>
  )
}

// 灯箱组件
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

const OSS_BASE = 'https://xiaoxiao0708.oss-cn-shanghai.aliyuncs.com'

function getImageUrl(filename: string): string {
  if (filename.startsWith('http')) return filename
  return `${OSS_BASE}/${filename}`
}