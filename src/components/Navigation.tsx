'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEditor } from '@/contexts/EditorContext'
import styles from './Navigation.module.css'

export default function Navigation() {
  const pathname = usePathname()
  const { isUnlocked, setIsUnlocked } = useEditor()
  const [showEditor, setShowEditor] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(false)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })
      if (res.ok) {
        setIsUnlocked(true)
        setShowEditor(false)
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <nav className={styles.nav}>
        <div className={styles.container}>
          <Link href="/" className={styles.logo}>
            <span className={styles.logoText}>森見月下</span>
          </Link>

          <div className={styles.links}>
            <Link
              href="/"
              className={`${styles.link} ${pathname === '/' ? styles.active : ''}`}
            >
              ✿ 作品
            </Link>
            {isUnlocked && (
              <>
                <Link
                  href="/upload"
                  className={`${styles.link} ${pathname === '/upload' ? styles.active : ''}`}
                >
                  ☆ 上传
                </Link>
                <Link
                  href="/manage"
                  className={`${styles.link} ${pathname === '/manage' ? styles.active : ''}`}
                >
                  ♡ 管理
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* 编辑解锁按钮 - 放在页面左下角 */}
      {!isUnlocked && !showEditor && (
        <button className={styles.lockBtn} onClick={() => setShowEditor(true)}>
          编辑
        </button>
      )}
      {!isUnlocked && showEditor && (
        <div className={styles.unlockArea}>
          <form onSubmit={handleUnlock} className={styles.unlockForm}>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="输入密码..."
              className={styles.unlockInput}
              autoFocus
            />
            {error && <span className={styles.unlockError}>密码错误</span>}
            <button type="submit" className={styles.unlockBtn} disabled={loading}>
              {loading ? '...' : '解锁'}
            </button>
          </form>
          <button className={styles.unlockCancel} onClick={() => { setShowEditor(false); setPassword('') }}>
            ✕
          </button>
        </div>
      )}
      {isUnlocked && (
        <button className={styles.lockBtn} onClick={() => { setIsUnlocked(false); setPassword('') }}>
          已解锁
        </button>
      )}
    </>
  )
}