import { useState, useEffect, useMemo } from 'react'
import { fetchCategoryManage, setCategoryParent, deleteCategory } from './api'

function ConfirmDelete({ name, onConfirm, onCancel }) {
  return (
    <div className="inline-confirm">
      <span>Remove <strong>{name}</strong> and unassign it from all merchants?</span>
      <button className="confirm-btn danger" onClick={onConfirm}>Yes, remove</button>
      <button className="confirm-btn" onClick={onCancel}>Cancel</button>
    </div>
  )
}

function SetParentForm({ category, primaries, onSave, onCancel }) {
  const [parentId, setParentId] = useState('')
  const available = primaries.filter(p => p.id !== category.id)

  return (
    <div className="inline-confirm">
      <span>Move <strong>{category.name}</strong> under:</span>
      <select
        className="category-select small"
        value={parentId}
        onChange={e => setParentId(e.target.value)}
      >
        <option value="">Choose a primary category…</option>
        {available.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <button className="confirm-btn primary" onClick={() => parentId && onSave(parentId)} disabled={!parentId}>
        Save
      </button>
      <button className="confirm-btn" onClick={onCancel}>Cancel</button>
    </div>
  )
}

function CategoryRow({ cat, primaries, onUpdate, onDelete }) {
  const [mode, setMode] = useState(null) // null | 'delete' | 'setParent'
  const [busy, setBusy] = useState(false)

  async function handleMakePrimary() {
    setBusy(true)
    await setCategoryParent(cat.id, null)
    onUpdate(cat.id, { parent_id: '', parent_name: '' })
    setBusy(false)
  }

  async function handleSetParent(parentId) {
    setBusy(true)
    const parent = primaries.find(p => p.id === parentId)
    await setCategoryParent(cat.id, parentId)
    onUpdate(cat.id, { parent_id: parentId, parent_name: parent?.name || '' })
    setMode(null)
    setBusy(false)
  }

  async function handleDelete() {
    setBusy(true)
    await deleteCategory(cat.id)
    onDelete(cat.id)
    setBusy(false)
  }

  const isPrimary = !cat.parent_id

  return (
    <div className={`cat-row${busy ? ' busy' : ''}`}>
      <div className="cat-row-main">
        <div className="cat-name-cell">
          <span className="cat-name">{cat.name}</span>
          <span className={`cat-type-badge ${isPrimary ? 'primary' : 'sub'}`}>
            {isPrimary ? 'Primary' : 'Subcategory'}
          </span>
        </div>
        <div className="cat-parent-cell">
          {cat.parent_name
            ? <span className="cat-parent-name">↳ {cat.parent_name}</span>
            : <span className="cat-no-parent">—</span>
          }
        </div>
        <div className="cat-count-cell">
          <span className="cat-count">{cat.merchant_count.toLocaleString()}</span>
        </div>
        <div className="cat-actions">
          {isPrimary ? (
            <button
              className="action-btn"
              onClick={() => setMode(mode === 'setParent' ? null : 'setParent')}
              disabled={busy}
              title="Move under a primary category"
            >
              Make subcategory
            </button>
          ) : (
            <button
              className="action-btn"
              onClick={handleMakePrimary}
              disabled={busy}
              title="Promote to top-level primary"
            >
              Make primary
            </button>
          )}
          <button
            className="action-btn danger"
            onClick={() => setMode(mode === 'delete' ? null : 'delete')}
            disabled={busy}
            title="Remove category and unassign from merchants"
          >
            Remove
          </button>
        </div>
      </div>

      {mode === 'delete' && (
        <ConfirmDelete
          name={cat.name}
          onConfirm={handleDelete}
          onCancel={() => setMode(null)}
        />
      )}
      {mode === 'setParent' && (
        <SetParentForm
          category={cat}
          primaries={primaries}
          onSave={handleSetParent}
          onCancel={() => setMode(null)}
        />
      )}
    </div>
  )
}

export default function CategoryManager() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetchCategoryManage()
      .then(data => { setCategories(data); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [])

  const primaries = useMemo(() => categories.filter(c => !c.parent_id), [categories])

  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase()
    return categories.filter(c => {
      const matchesSearch = !q || c.name.toLowerCase().includes(q) || (c.parent_name || '').toLowerCase().includes(q)
      const matchesFilter =
        filter === 'all' ||
        (filter === 'primary' && !c.parent_id) ||
        (filter === 'sub' && c.parent_id)
      return matchesSearch && matchesFilter
    })
  }, [categories, search, filter])

  function handleUpdate(id, changes) {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...changes } : c))
  }

  function handleDelete(id) {
    setCategories(prev => prev.filter(c => c.id !== id))
  }

  if (loading) return <div className="loading">Loading categories…</div>
  if (error) return <div className="loading error">Error: {error}</div>

  const primaryCount = categories.filter(c => !c.parent_id).length
  const subCount = categories.filter(c => c.parent_id).length

  return (
    <>
      <div className="header">
        <h1>Category Manager</h1>
        <p>{categories.length} active categories · {primaryCount} primary · {subCount} subcategories</p>
      </div>

      <div className="controls">
        <input
          className="search-input"
          type="search"
          placeholder="Search categories…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="filter-tabs">
          {[['all', 'All'], ['primary', 'Primary'], ['sub', 'Subcategories']].map(([val, label]) => (
            <button
              key={val}
              className={`filter-tab${filter === val ? ' active' : ''}`}
              onClick={() => setFilter(val)}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="results-count">{displayed.length.toLocaleString()} shown</span>
      </div>

      <div className="cat-table">
        <div className="cat-table-header">
          <div className="cat-name-cell">Category</div>
          <div className="cat-parent-cell">Parent</div>
          <div className="cat-count-cell">Merchants</div>
          <div className="cat-actions">Actions</div>
        </div>
        {displayed.length > 0
          ? displayed.map(cat => (
              <CategoryRow
                key={cat.id}
                cat={cat}
                primaries={primaries}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            ))
          : (
            <div className="empty-state" style={{ gridColumn: '1/-1', padding: '40px 0' }}>
              <h2>No categories found</h2>
            </div>
          )
        }
      </div>
    </>
  )
}
