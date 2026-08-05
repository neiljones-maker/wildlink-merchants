import { useState, useEffect, useMemo } from 'react'
import { fetchTags, createTag, renameTag, deleteTag } from './api'

const TAG_TYPES = [
  { value: 'occasion', label: 'Occasion' },
  { value: 'seasonal', label: 'Seasonal' },
  { value: 'audience', label: 'Audience' },
]

function TagRow({ tag, onRename, onDelete }) {
  const [mode, setMode] = useState(null) // null | 'edit' | 'confirm'
  const [editName, setEditName] = useState(tag.name)
  const [busy, setBusy] = useState(false)

  async function handleRename() {
    if (!editName.trim() || editName.trim() === tag.name) { setMode(null); return }
    setBusy(true)
    await renameTag(tag.id, editName.trim())
    onRename(tag.id, editName.trim())
    setMode(null)
    setBusy(false)
  }

  async function handleDelete() {
    setBusy(true)
    await deleteTag(tag.id)
    onDelete(tag.id)
    setBusy(false)
  }

  return (
    <div className={`tag-row${busy ? ' busy' : ''}`}>
      <div className="tag-row-main">
        {mode === 'edit' ? (
          <input
            className="tag-edit-input"
            value={editName}
            onChange={e => setEditName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleRename()
              if (e.key === 'Escape') { setEditName(tag.name); setMode(null) }
            }}
            autoFocus
          />
        ) : (
          <span className={`tag-pill ${tag.type}`}>{tag.name}</span>
        )}

        <div className="tag-icon-actions">
          {mode === 'edit' ? (
            <>
              <button className="icon-btn save" onClick={handleRename} title="Save" disabled={busy}>✓</button>
              <button className="icon-btn" onClick={() => { setEditName(tag.name); setMode(null) }} title="Cancel">✕</button>
            </>
          ) : (
            <>
              <button className="icon-btn" onClick={() => setMode('edit')} title="Rename">✎</button>
              <button className="icon-btn remove" onClick={() => setMode('confirm')} title="Remove">✕</button>
            </>
          )}
        </div>
      </div>

      {mode === 'confirm' && (
        <div className="tag-confirm-row">
          <span>Remove from all merchants?</span>
          <button className="icon-confirm danger" onClick={handleDelete} disabled={busy}>Yes</button>
          <button className="icon-confirm" onClick={() => setMode(null)}>No</button>
        </div>
      )}
    </div>
  )
}

function AddTagRow({ type, onAdd }) {
  const [name, setName] = useState('')
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  async function handleAdd() {
    if (!name.trim()) return
    setBusy(true)
    const { id } = await createTag(name.trim(), type)
    onAdd({ id, name: name.trim(), type })
    setName('')
    setOpen(false)
    setBusy(false)
  }

  if (!open) return (
    <button className="add-tag-btn" onClick={() => setOpen(true)}>+ Add tag</button>
  )

  return (
    <div className="add-tag-form">
      <input
        className="tag-edit-input"
        placeholder={`New ${type} tag…`}
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setOpen(false) }}
        autoFocus
      />
      <button className="icon-btn save" onClick={handleAdd} disabled={busy || !name.trim()} title="Add">✓</button>
      <button className="icon-btn" onClick={() => setOpen(false)} title="Cancel">✕</button>
    </div>
  )
}

export default function TagManager() {
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchTags().then(data => { setTags(data); setLoading(false) })
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? tags.filter(t => t.type !== 'discount' && t.name.toLowerCase().includes(q))
             : tags.filter(t => t.type !== 'discount')
  }, [tags, search])

  const grouped = useMemo(() => (
    TAG_TYPES.map(({ value, label }) => ({
      type: value,
      label,
      tags: filtered.filter(t => t.type === value),
    }))
  ), [filtered])

  function handleRename(id, name) {
    setTags(prev => prev.map(t => t.id === id ? { ...t, name } : t))
  }
  function handleDelete(id) {
    setTags(prev => prev.filter(t => t.id !== id))
  }
  function handleAdd(tag) {
    setTags(prev => [...prev, tag])
  }

  if (loading) return <div className="loading">Loading tags…</div>

  return (
    <>
      <div className="header">
        <h1>Tag Manager</h1>
        <p>{filtered.length} tags across {TAG_TYPES.length} types</p>
      </div>

      <div className="controls">
        <input
          className="search-input"
          type="search"
          placeholder="Search tags…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="tag-groups">
        {grouped.map(({ type, label, tags: groupTags }) => (
          <div key={type} className="tag-group">
            <div className="tag-group-header">
              <span className={`tag-type-label ${type}`}>{label}</span>
              <span className="tag-group-count">{groupTags.length}</span>
            </div>
            <div className="tag-group-body">
              {groupTags.map(tag => (
                <TagRow key={tag.id} tag={tag} onRename={handleRename} onDelete={handleDelete} />
              ))}
              {!search && <AddTagRow type={type} onAdd={handleAdd} />}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
