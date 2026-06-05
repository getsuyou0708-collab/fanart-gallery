'use client'

import { Artwork } from '@/lib/types'
import styles from './MediaCard.module.css'

const OSS_BASE = 'https://xiaoxiao0708.oss-cn-shanghai.aliyuncs.com'

function getImageUrl(filename: string): string {
  if (filename.startsWith('http')) return filename
  return `${OSS_BASE}/${filename}`
}

interface Props {
  artwork: Artwork
  onClick?: () => void
  showDownload?: boolean
}

export default function MediaCard({ artwork, onClick, showDownload }: Props) {
  const imageUrl = getImageUrl(artwork.filename)

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation()
    const link = document.createElement('a')
    link.href = imageUrl
    link.download = artwork.filename.split('/').pop() || artwork.title
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className={styles.card} onClick={onClick}>
      <img src={imageUrl} alt={artwork.title} className={styles.img} />
      {showDownload && (
        <button className={styles.downloadBtn} onClick={handleDownload} title="下载">
          ↓
        </button>
      )}
      <div className={styles.cardInfo}>
        <p className={styles.cardTitle}>{artwork.title}</p>
      </div>
    </div>
  )
}