'use client'

import { useEffect } from 'react'
import styles from './Modal.module.css'

interface Props {
  children: React.ReactNode
  onClose: () => void
}

export default function Modal({ children, onClose }: Props) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEsc)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.imageWrapper} onClick={e => e.stopPropagation()}>
        {children}
      </div>
      <button className={styles.closeBtn} onClick={onClose}>✕</button>
    </div>
  )
}