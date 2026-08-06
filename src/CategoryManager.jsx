import { useState, useEffect, useMemo } from 'react'
import { fetchNewCategoryManage } from './api'

function TopCategoryRow({ cat, isExpanded, onToggle }) {
  return (
    <div className="cat-row top-cat-row" onClick={onToggle} role="button" style={{ cursor: 'pointer' }}>
      <div className="cat-row-main">
        <div className="cat-name-cell">
          <span className="expand-icon">{isExpanded ? '▾' : '▸'}</span>
          <span className="cat-name">{cat.name}</span>
          <span className="cat-type-badge primary">Top Category</span>
        </div>
        <div className="cat-parent-cell">
          <span className="cat-no-parent">—</span>
        </div>
        <div className="cat-count-cell">
          <span className="cat-count">{cat.merchant_count.toLocaleString()}</span>
        </div>
        <div className="cat-actions" />
      </div>
    </div>
  )
}

function SubcategoryRow({ sub }) {
  return (
    <div className="cat-row sub-cat-row">
      <div className="cat-row-main">
        <div className="cat-name-cell" style={{ paddingLeft: '32px' }}>
          <span className="cat-name">{sub.name}</span>
          <span className="cat-type-badge sub">Subcategory</span>
        </div>
        <div className="cat-parent-cell">
          <span className="cat-parent-name">↳ {sub.top_category_name}</span>
        </div>
        <div className="cat-count-cell">
          <span className="cat-count">{sub.merchant_count.toLocaleString()}</span>
        </div>
        <div className="cat-actions" />
      </div>
    </div>
  )
}

export default function CategoryManager() {
  const [tops, setTops] = useState([])
  const [subs, setSubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [expandedIds, setExpandedIds] = useState(new Set())

  useEffect(() => {
    fetchNewCategoryManage()
      .then(({ tops, subs }) => {
        setTops(tops)
        setSubs(subs)
        // Expand all top categories by default
        setExpandedIds(new Set(tops.map(t => t.id)))
        setLoading(false)
      })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [])

  function toggleExpand(id) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const q = search.trim().toLowerCase()

  const filteredTops = useMemo(() => {
    if (filter === 'sub') return []
    return tops.filter(t =>
      !q || t.name.toLowerCase().includes(q) ||
      subs.some(s => s.top_category_id === t.id && s.name.toLowerCase().includes(q))
    )
  }, [tops, subs, q, filter])

  const filteredSubs = useMemo(() => {
    if (filter === 'primary') return []
    return subs.filter(s =>
      !q || s.name.toLowerCase().includes(q) || s.top_category_name.toLowerCase().includes(q)
    )
  }, [subs, q, filter])

  if (loading) return <div className="loading">Loading categories…</div>
  if (error) return <div className="loading error">Error: {error}</div>

  return (
    <>
      <div className="header">
        <h1>Category Manager</h1>
        <p>{tops.length} top categories · {subs.length} subcategories</p>
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
          {[['all', 'All'], ['primary', 'Top Categories'], ['sub', 'Subcategories']].map(([val, label]) => (
            <button
              key={val}
              className={`filter-tab${filter === val ? ' active' : ''}`}
              onClick={() => setFilter(val)}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="results-count">
          {filter === 'primary' ? `${filteredTops.length} shown`
            : filter === 'sub' ? `${filteredSubs.length} shown`
            : `${filteredTops.length + filteredSubs.length} shown`}
        </span>
      </div>

      <div className="cat-table">
        <div className="cat-table-header">
          <div className="cat-name-cell">Category</div>
          <div className="cat-parent-cell">Parent</div>
          <div className="cat-count-cell">Merchants</div>
          <div className="cat-actions" />
        </div>

        {filter === 'sub' ? (
          filteredSubs.map(sub => <SubcategoryRow key={sub.id} sub={sub} />)
        ) : filter === 'primary' ? (
          filteredTops.map(top => <TopCategoryRow key={top.id} cat={top} isExpanded={false} onToggle={() => {}} />)
        ) : (
          filteredTops.map(top => (
            <div key={top.id}>
              <TopCategoryRow
                cat={top}
                isExpanded={expandedIds.has(top.id)}
                onToggle={() => toggleExpand(top.id)}
              />
              {expandedIds.has(top.id) && filteredSubs
                .filter(s => s.top_category_id === top.id)
                .map(sub => <SubcategoryRow key={sub.id} sub={sub} />)
              }
            </div>
          ))
        )}

        {filteredTops.length === 0 && filteredSubs.length === 0 && (
          <div className="empty-state" style={{ gridColumn: '1/-1', padding: '40px 0' }}>
            <h2>No categories found</h2>
          </div>
        )}
      </div>
    </>
  )
}
