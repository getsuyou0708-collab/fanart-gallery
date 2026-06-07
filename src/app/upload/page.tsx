'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'

interface FormData {
  title: string
  works: string
  cps: string
  tags: string
  date: string
}

interface HistoryData {
  works: string[]
  cps: string[]
  tags: string[]
}

interface PreviewItem {
  file: File
  url: string
  title: string
}

export default function UploadPage() {
  const [files, setFiles] = useState<PreviewItem[]>([])
  const [form, setForm] = useState<FormData>({
    title: '',
    works: '',
    cps: '',
    tags: '',
    date: new Date().toISOString().split('T')[0],
  })
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [history, setHistory] = useState<HistoryData>({ works: [], cps: [], tags: [] })
  const [showSuggestions, setShowSuggestions] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; percent: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    const saved = localStorage.getItem('uploadHistory')
    if (saved) {
      setHistory(JSON.parse(saved))
    }
  }, [])

  const saveHistory = (newHistory: HistoryData) => {
    setHistory(newHistory)
    localStorage.setItem('uploadHistory', JSON.stringify(newHistory))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || [])
    if (!newFiles.length) return

    const previews: PreviewItem[] = newFiles.map(f => ({
      file: f,
      url: URL.createObjectURL(f),
      title: f.name.replace(/\.[^.]+$/, '')
    }))

    setFiles(prev => [...prev, ...previews])
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const droppedFiles = Array.from(e.dataTransfer.files)
    if (!droppedFiles.length) return

    const previews: PreviewItem[] = droppedFiles.map(f => ({
      file: f,
      url: URL.createObjectURL(f),
      title: f.name.replace(/\.[^.]+$/, '')
    }))

    setFiles(prev => [...prev, ...previews])
  }

  const removeFile = (index: number) => {
    setFiles(prev => {
      const newFiles = [...prev]
      URL.revokeObjectURL(newFiles[index].url)
      newFiles.splice(index, 1)
      return newFiles
    })
  }

  const updateTitle = (index: number, title: string) => {
    setFiles(prev => {
      const newFiles = [...prev]
      newFiles[index] = { ...newFiles[index], title }
      return newFiles
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (files.length === 0) {
      setMessage({ type: 'error', text: '请选择至少一张图片' })
      return
    }

    setUploading(true)
    setMessage(null)
    setUploadProgress({ current: 0, total: files.length, percent: 0 })

    let successCount = 0
    let errorMessages: string[] = []

    for (let i = 0; i < files.length; i++) {
      const item = files[i]
      try {
        // 1. 获取 OSS 表单上传签名
        const signRes = await fetch('/api/oss-sign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: item.file.name }),
          credentials: 'include'
        })

        if (!signRes.ok) {
          const data = await signRes.json()
          errorMessages.push(`签名失败: ${data.error}`)
          continue
        }

        const { host, objectKey, accessKeyId, policy, signature } = await signRes.json()

        // 2. 浏览器直传 POST FormData 到 OSS（不经过 Vercel，绕过 4.5MB 限制）
        const uploadFormData = new FormData()
        uploadFormData.append('key', objectKey)
        uploadFormData.append('OSSAccessKeyId', accessKeyId)
        uploadFormData.append('policy', policy)
        uploadFormData.append('signature', signature)
        uploadFormData.append('success_action_status', '200')
        uploadFormData.append('file', item.file)

        const uploadRes = await fetch(host, {
          method: 'POST',
          body: uploadFormData
        })

        if (!uploadRes.ok && uploadRes.status !== 204) {
          errorMessages.push(`图片 ${item.title} 上传失败 (${uploadRes.status})`)
          continue
        }

        // 3. 保存元数据到 Supabase
        const id = objectKey.match(/art_([^.]+)/)?.[1] || `art_${Date.now()}`
        const newArtwork = {
          id,
          title: form.title || item.title,
          filename: objectKey,
          type: item.file.type.startsWith('video') ? 'video' : 'image',
          works: form.works.split(',').map(s => s.trim()).filter(Boolean),
          cps: form.cps.split(',').map(s => s.trim()).filter(Boolean),
          tags: form.tags.split(',').map(s => s.trim()).filter(Boolean),
          createdAt: new Date(form.date).toISOString()
        }

        const saveRes = await fetch('/api/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ artworks: [newArtwork] }),
          credentials: 'include'
        })

        if (saveRes.ok) {
          successCount++
        } else {
          const data = await saveRes.json()
          errorMessages.push(`保存元数据失败: ${data.error}`)
        }
      } catch (err) {
        errorMessages.push(`图片 ${item.title} 请求失败`)
      }

      setUploadProgress({ current: i + 1, total: files.length, percent: Math.round(((i + 1) / files.length) * 100) })
    }

    setUploadProgress(null)

    if (successCount === files.length) {
      setMessage({ type: 'success', text: `成功上传 ${successCount} 张图片！` })
    } else if (successCount > 0) {
      setMessage({ type: 'error', text: `部分成功（${successCount}/${files.length}）: ${errorMessages.join(', ')}` })
    } else {
      setMessage({ type: 'error', text: `失败: ${errorMessages.join(', ')}` })
    }

    if (successCount > 0) {
      const newHistory = { ...history }
      form.works.split(',').map(s => s.trim()).filter(Boolean).forEach(w => {
        if (!newHistory.works.includes(w)) newHistory.works.unshift(w)
      })
      form.cps.split(',').map(s => s.trim()).filter(Boolean).forEach(c => {
        if (!newHistory.cps.includes(c)) newHistory.cps.unshift(c)
      })
      form.tags.split(',').map(s => s.trim()).filter(Boolean).forEach(t => {
        if (!newHistory.tags.includes(t)) newHistory.tags.unshift(t)
      })

      newHistory.works = newHistory.works.slice(0, 20)
      newHistory.cps = newHistory.cps.slice(0, 20)
      newHistory.tags = newHistory.tags.slice(0, 20)
      saveHistory(newHistory)

      setTimeout(() => router.push('/'), 1500)
    }

    setUploading(false)
  }

  const handleInputFocus = (field: 'works' | 'cps' | 'tags') => {
    setShowSuggestions(field)
  }

  const handleInputBlur = () => {
    setTimeout(() => setShowSuggestions(null), 200)
  }

  const insertSuggestion = (field: 'works' | 'cps' | 'tags', value: string) => {
    const current = form[field].split(',').map(s => s.trim()).filter(Boolean)
    if (!current.includes(value)) {
      const newValue = form[field] ? `${form[field]}, ${value}` : value
      setForm(f => ({ ...f, [field]: newValue }))
    }
    setShowSuggestions(null)
  }

  const deleteSuggestion = (field: 'works' | 'cps' | 'tags', value: string, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    const newHistory = {
      ...history,
      [field]: history[field].filter(item => item !== value)
    }
    saveHistory(newHistory)
  }

  const SuggestionList = ({ items, field, onSelect }: { items: string[], field: 'works' | 'cps' | 'tags', onSelect: (v: string) => void }) => (
    items.length > 0 ? (
      <div className={styles.suggestions}>
        {items.map((item, i) => (
          <button key={i} type="button" className={styles.suggestionItem} onClick={() => onSelect(item)}>
            <span>{item}</span>
            <span
              className={styles.suggestionDelete}
              onClick={e => deleteSuggestion(field, item, e)}
              title="删除"
            >✕</span>
          </button>
        ))}
      </div>
    ) : null
  )

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>上传作品</h1>

        <div
          className={styles.dropzone}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
        >
          {files.length > 0 ? (
            <div className={styles.previewGrid}>
              {files.map((item, idx) => (
                <div key={idx} className={styles.previewItem}>
                  {item.file.type.startsWith('video') ? (
                    <video src={item.url} className={styles.previewImg} />
                  ) : (
                    <img src={item.url} alt={item.title} className={styles.previewImg} />
                  )}
                  <button
                    className={styles.removeBtn}
                    onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                  >✕</button>
                </div>
              ))}
              <div className={styles.addMore} onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                <span>+</span>
              </div>
            </div>
          ) : (
            <div className={styles.dropzoneHint}>
              <span className={styles.uploadIcon}>🪻</span>
              <p>拖拽或点击上传</p>
              <p className={styles.hintSub}>支持 jpg、png、gif、mp4（可多选）</p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleFileChange}
            className={styles.hiddenInput}
          />
        </div>

        {files.length > 0 && (
          <div className={styles.titleEdit}>
            <p className={styles.titleEditHint}>点击标题可修改 ✧</p>
            {files.map((item, idx) => (
              <input
                key={idx}
                type="text"
                value={item.title}
                onChange={e => updateTitle(idx, e.target.value)}
                className={styles.titleInput}
              />
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label>标题</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="统一标题（可留空）"
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label>创作日期</label>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className={styles.dateInput}
            />
          </div>

          <div className={styles.fieldWithSuggest}>
            <label>作品名</label>
            <div className={styles.inputWrapper}>
              <input
                type="text"
                value={form.works}
                onChange={e => setForm(f => ({ ...f, works: e.target.value }))}
                onFocus={() => handleInputFocus('works')}
                onBlur={handleInputBlur}
                placeholder="如：进巨、咒术（多个用逗号分隔）"
                className={styles.input}
              />
              {showSuggestions === 'works' && (
                <SuggestionList items={history.works} field="works" onSelect={v => insertSuggestion('works', v)} />
              )}
            </div>
          </div>

          <div className={styles.fieldWithSuggest}>
            <label>CP</label>
            <div className={styles.inputWrapper}>
              <input
                type="text"
                value={form.cps}
                onChange={e => setForm(f => ({ ...f, cps: e.target.value }))}
                onFocus={() => handleInputFocus('cps')}
                onBlur={handleInputBlur}
                placeholder="如：Erikusa、五夏（多个用逗号分隔）"
                className={styles.input}
              />
              {showSuggestions === 'cps' && (
                <SuggestionList items={history.cps} field="cps" onSelect={v => insertSuggestion('cps', v)} />
              )}
            </div>
          </div>

          <div className={styles.fieldWithSuggest}>
            <label>标签</label>
            <div className={styles.inputWrapper}>
              <input
                type="text"
                value={form.tags}
                onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                onFocus={() => handleInputFocus('tags')}
                onBlur={handleInputBlur}
                placeholder="自由添加标签（多个用逗号分隔）"
                className={styles.input}
              />
              {showSuggestions === 'tags' && (
                <SuggestionList items={history.tags} field="tags" onSelect={v => insertSuggestion('tags', v)} />
              )}
            </div>
          </div>

          {message && (
            <p className={`${styles.message} ${styles[message.type]}`}>{message.text}</p>
          )}

          {uploadProgress && (
            <div className={styles.progressContainer}>
              <div className={styles.progressText}>
                上传中 {uploadProgress.current}/{uploadProgress.total} ({uploadProgress.percent}%)
              </div>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${uploadProgress.percent}%` }}
                />
              </div>
            </div>
          )}

          <button type="submit" className={styles.btn} disabled={uploading}>
            {uploading ? '上传中...' : `确认上传（${files.length}张）`}
          </button>
        </form>
      </div>
    </div>
  )
}