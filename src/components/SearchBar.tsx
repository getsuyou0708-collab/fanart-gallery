'use client'

import { useState, useEffect } from 'react'
import styles from './SearchBar.module.css'

interface Props {
  onSearch: (query: string) => void
  placeholder?: string
}

export default function SearchBar({ onSearch, placeholder = '搜索作品、CP ✧' }: Props) {
  const [value, setValue] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(value)
    }, 300)
    return () => clearTimeout(timer)
  }, [value, onSearch])

  return (
    <div className={styles.wrapper}>
      <span className={styles.icon}>✨</span>
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder={placeholder}
        className={styles.input}
      />
      {value && (
        <button className={styles.clear} onClick={() => setValue('')}>✕</button>
      )}
    </div>
  )
}