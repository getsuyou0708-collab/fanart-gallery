'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Artwork } from '@/lib/types'
import { getArtworks } from '@/lib/data'
import styles from './page.module.css'

const OSS_BASE = 'https://xiaoxiao0708.oss-cn-shanghai.aliyuncs.com'

function getImageUrl(filename: string): string {
  if (filename.startsWith('http')) return filename
  return `${OSS_BASE}/${filename}`
}

export default function ArtworkDetailPage() {
  const router = useRouter()
  const params = useParams()
  const artworkId = params.id as string

  const [artwork, setArtwork] = useState<Artwork | null>(null)
  const [allArtworks, setAllArtworks] = useState<Artwork[]>([])
  const [groupImages, setGroupImages] = useState<Artwork[]>([])
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

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
  const prevArtwork = currentIndex > 0 ? allArtworks[currentIndex - 1] : null
  const nextArtwork = currentIndex < allArtworks.length - 1 ? allArtworks[currentIndex + 1] : null

  // 导航到上一个/下一个作品
  const goToPrevArtwork = useCallback(() => {
    if (prevArtwork) {
      setIsLightboxOpen(false)
      router.push(`/artwork/${prevArtwork.id}`)
    }
  }, [prevArtwork, router])

  const goToNextArtwork = useCallback(() => {
    if (nextArtwork) {
      setIsLightboxOpen(false)
      router.push(`/artwork/${nextArtwork.id}`)
    }
  }, [nextArtwork, router])

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

  // 键盘导航
  useEffect(() => {
    if (!artwork) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLightboxOpen) {
        // 灯箱打开时：上下箭头切换图片，左右箭头切换作品
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
          if (prevArtwork) {
            setIsLightboxOpen(false)
            router.push(`/artwork/${prevArtwork.id}`)
          }
        } else if (e.key === 'ArrowRight') {
          e.preventDefault()
          if (nextArtwork) {
            setIsLightboxOpen(false)
            router.push(`/artwork/${nextArtwork.id}`)
          }
        } else if (e.key === 'Escape') {
          setIsLightboxOpen(false)
        }
      } else {
        // 灯箱关闭时：左右箭头切换作品
        if (e.key === 'ArrowLeft') {
          e.preventDefault()
          if (prevArtwork) {
            router.push(`/artwork/${prevArtwork.id}`)
          }
        } else if (e.key === 'ArrowRight') {
          e.preventDefault()
          if (nextArtwork) {
            router.push(`/artwork/${nextArtwork.id}`)
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [artwork, isLightboxOpen, lightboxIndex, groupImages.length, prevArtwork, nextArtwork, router])

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
      {/* 顶部导航 */}
      <div className={styles.header}>
        <button
          className={`${styles.navBtn} ${!prevArtwork ? styles.disabled : ''}`}
          onClick={goToPrevArtwork}
          disabled={!prevArtwork}
        >
          ← 上一个
        </button>
        <h1 className={styles.title}>{artwork.title}</h1>
        <button
          className={`${styles.navBtn} ${!nextArtwork ? styles.disabled : ''}`}
          onClick={goToNextArtwork}
          disabled={!nextArtwork}
        >
          下一个 →
        </button>
      </div>

      {/* 图片网格 */}
      <div className={styles.imageGrid}>
        {groupImages.map((img, index) => (
          <div
            key={img.id}
            className={styles.imageItem}
            onClick={() => openLightbox(index)}
          >
            <img src={getImageUrl(img.filename)} alt={img.title} />
          </div>
        ))}
      </div>

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
          {prevArtwork && (
            <button
              className={styles.lightboxPrevArtwork}
              onClick={e => { e.stopPropagation(); goToPrevArtwork() }}
            >❮</button>
          )}
          {nextArtwork && (
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