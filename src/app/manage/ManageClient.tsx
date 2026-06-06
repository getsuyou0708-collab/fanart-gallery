'use client'

import { useState } from 'react'
import styles from './page.module.css'
import { Artwork } from '@/lib/types'

const OSS_BASE = 'https://xiaoxiao0708.oss-cn-shanghai.aliyuncs.com'

function getImageUrl(filename: string): string {
  if (filename.startsWith('http')) return filename
  return `${OSS_BASE}/${filename}`
}

interface Props {
  artworks: Artwork[]
}

export default function ManageClient({ artworks }: Props) {
  const [items, setItems] = useState(artworks.sort((a, b) => a.order - b.order))
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Artwork>>({})
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const filteredItems = items.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.works.some(w => w.toLowerCase().includes(searchQuery.toLowerCase())) ||
    item.cps.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const allSelected = filteredItems.length > 0 && filteredItems.every(item => selectedIds.includes(item.id))

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredItems.map(item => item.id))
    }
  }

  const handleDragStart = (id: string) => {
    setDraggedId(id)
  }

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggedId || draggedId === targetId) return

    setItems(prev => {
      const newItems = [...prev]
      const draggedIdx = newItems.findIndex(i => i.id === draggedId)
      const targetIdx = newItems.findIndex(i => i.id === targetId)
      const [dragged] = newItems.splice(draggedIdx, 1)
      newItems.splice(targetIdx, 0, dragged)
      return newItems
    })
  }

  const handleDragEnd = () => {
    setDraggedId(null)
    setItems(prev => prev.map((item, idx) => ({ ...item, order: idx + 1 })))
    saveOrder()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除吗？')) return
    const res = await fetch(`/api/delete?id=${id}`, { method: 'DELETE', credentials: 'include' })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      setItems(prev => prev.filter(i => i.id !== id))
      setSelectedIds(prev => prev.filter(i => i !== id))
    } else {
      alert('删除失败: ' + (data.error || res.statusText))
    }
  }

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`确定要删除选中的 ${selectedIds.length} 个作品吗？`)) return

    for (const id of selectedIds) {
      await fetch(`/api/delete?id=${id}`, { method: 'DELETE', credentials: 'include' })
    }
    setItems(prev => prev.filter(i => !selectedIds.includes(i.id)))
    setSelectedIds([])
  }

  const startEdit = (item: Artwork) => {
    setEditingId(item.id)
    setEditForm({
      title: item.title,
      works: item.works,
      cps: item.cps,
      tags: item.tags
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({})
  }

  const saveEdit = async () => {
    if (!editingId || !editForm.title) return

    const updatedItems = items.map(item =>
      item.id === editingId ? {
        ...item,
        title: editForm.title!,
        works: editForm.works || [],
        cps: editForm.cps || [],
        tags: editForm.tags || []
      } : item
    )

    setItems(updatedItems)
    setEditingId(null)

    await fetch('/api/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artworks: updatedItems })
    })
  }

  const saveOrder = async () => {
    await fetch('/api/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artworks: items })
    })
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>管理作品</h1>

      <div className={styles.toolbar}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="搜索作品 ✧"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        <div className={styles.toolbarRight}>
          <label className={styles.selectAll}>
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
            />
            全选
          </label>
          {selectedIds.length > 0 && (
            <button className={styles.batchDeleteBtn} onClick={handleBatchDelete}>
              🗑 批量删除 ({selectedIds.length})
            </button>
          )}
        </div>
      </div>

      <p className={styles.hint}>✧ 拖拽调整顺序，点击编辑按钮修改信息</p>

      <div className={styles.list}>
        {filteredItems.map(item => (
          <div
            key={item.id}
            className={`${styles.item} ${draggedId === item.id ? styles.dragging : ''} ${selectedIds.includes(item.id) ? styles.selected : ''}`}
            draggable
            onDragStart={() => handleDragStart(item.id)}
            onDragOver={e => handleDragOver(e, item.id)}
            onDragEnd={handleDragEnd}
          >
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={selectedIds.includes(item.id)}
              onChange={() => toggleSelect(item.id)}
              onClick={e => e.stopPropagation()}
            />
            <span className={styles.dragHandle}>☰</span>
            <div className={styles.thumb}>
              {item.type === 'video' ? (
                <div className={styles.videoThumb}>▶</div>
              ) : (
                <img
                  src={getImageUrl(item.filename)}
                  alt={item.title}
                  className={styles.thumbImg}
                />
              )}
            </div>

            {editingId === item.id ? (
              <div className={styles.editForm}>
                <input
                  type="text"
                  className={styles.editInput}
                  value={editForm.title}
                  onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                  placeholder="标题"
                />
                <input
                  type="text"
                  className={styles.editInput}
                  value={editForm.works?.join(', ')}
                  onChange={e => setEditForm({ ...editForm, works: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  placeholder="作品（逗号分隔）"
                />
                <input
                  type="text"
                  className={styles.editInput}
                  value={editForm.cps?.join(', ')}
                  onChange={e => setEditForm({ ...editForm, cps: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  placeholder="CP（逗号分隔）"
                />
                <div className={styles.editButtons}>
                  <button className={styles.saveBtn} onClick={saveEdit}>✓ 保存</button>
                  <button className={styles.cancelBtn} onClick={cancelEdit}>✕ 取消</button>
                </div>
              </div>
            ) : (
              <div className={styles.info}>
                <span className={styles.itemTitle}>{item.title}</span>
                <div className={styles.tags}>
                  {item.works.map(w => <span key={w} className={styles.tag}>{w}</span>)}
                  {item.cps.map(c => <span key={c} className={`${styles.tag} ${styles.cpTag}`}>{c}</span>)}
                </div>
              </div>
            )}

            {editingId !== item.id && (
              <span className={styles.date}>{new Date(item.createdAt).toLocaleDateString('zh-CN')}</span>
            )}

            <div className={styles.actions}>
              {editingId !== item.id && (
                <button className={styles.editBtn} onClick={() => startEdit(item)}>✎</button>
              )}
              <button className={styles.deleteBtn} onClick={() => handleDelete(item.id)}>🗑</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}