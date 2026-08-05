import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { Routes, Route } from 'react-router-dom'
import MerchantModal from './MerchantModal'
import CategoryManager from './CategoryManager'
import Nav from './Nav'
import { fetchMerchants } from './api'

const PAGE_SIZE = 48

function buildCategoryList(data) {
  return [...new Set(
    data.flatMap(m => m.categories ? m.categories.split(',').map(c => c.trim()) : [])
  )].sort()
}

function formatRate(rate) {
  if (!rate || rate === 0) return null
  return `${(rate * 100).toFixed(1)}%`
}

function MerchantCard({ merchant, onClick }) {
  const cats = merchant.categories
    ? merchant.categories.split(',').map(c => c.trim()).filter(Boolean)
    : []
  const primary = merchant.primary_category?.trim()
  const rate = formatRate(merchant.default_rate)

  return (
    <div className="card" onClick={onClick} role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}>
      <div className="card-header">
        <span className="merchant-name">{merchant.name}</span>
        {rate && <span className="rate-badge">{rate}</span>}
      </div>
      {merchant.url && (
        <a className="merchant-url" href={merchant.url} target="_blank" rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}>
          {merchant.url.replace(/^https?:\/\//, '')}
        </a>
      )}
      <div className="categories">
        {cats.length > 0
          ? cats.map(cat => (
              <span key={cat} className={`tag${cat === primary ? ' primary' : ''}`}>
                {cat}
              </span>
            ))
          : <span className="no-categories">No categories</span>
        }
      </div>
      <span className="card-cta">Click to view &amp; edit →</span>
    </div>
  )
}

function MerchantBrowser() {
  const [merchantData, setMerchantData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [activeMerchant, setActiveMerchant] = useState(null)
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE)
  const sentinelRef = useRef(null)

  useEffect(() => {
    fetchMerchants()
      .then(data => { setMerchantData(data); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [])

  // Reset display count when filters change
  useEffect(() => { setDisplayCount(PAGE_SIZE) }, [search, selectedCategory])

  const allCategories = useMemo(() => buildCategoryList(merchantData), [merchantData])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return merchantData.filter(m => {
      const matchesSearch = !q || m.name.toLowerCase().includes(q) || (m.url || '').toLowerCase().includes(q)
      const matchesCat = !selectedCategory || (m.categories || '').split(',').map(c => c.trim()).includes(selectedCategory)
      return matchesSearch && matchesCat
    })
  }, [merchantData, search, selectedCategory])

  const visible = filtered.slice(0, displayCount)
  const hasMore = displayCount < filtered.length

  // Infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        setDisplayCount(prev => Math.min(prev + PAGE_SIZE, filtered.length))
      }
    }, { rootMargin: '200px' })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [filtered.length, hasMore])

  function handleSave(updated) {
    setMerchantData(prev => prev.map(m => m.id === updated.id ? updated : m))
    if (activeMerchant?.id === updated.id) setActiveMerchant(updated)
  }

  if (loading) return <div className="loading">Loading merchants…</div>
  if (error) return <div className="loading error">Error: {error}</div>

  return (
    <>
      <div className="header">
        <h1>Merchant Browser</h1>
        <p>{merchantData.length.toLocaleString()} active merchants</p>
      </div>

      <div className="controls">
        <input
          className="search-input"
          type="search"
          placeholder="Search merchants..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="category-select"
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
        >
          <option value="">All categories</option>
          {allCategories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <span className="results-count">
          {filtered.length.toLocaleString()} result{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid">
        {visible.length > 0
          ? visible.map(m => (
              <MerchantCard
                key={m.id}
                merchant={m}
                onClick={() => setActiveMerchant(m)}
              />
            ))
          : (
            <div className="empty-state">
              <h2>No merchants found</h2>
              <p>Try a different search or category filter.</p>
            </div>
          )
        }
      </div>

      {hasMore && (
        <div ref={sentinelRef} className="load-sentinel">
          <span className="load-hint">Showing {visible.length.toLocaleString()} of {filtered.length.toLocaleString()}</span>
        </div>
      )}

      <MerchantModal
        merchant={activeMerchant}
        onClose={() => setActiveMerchant(null)}
        onSave={handleSave}
      />
    </>
  )
}

export default function App() {
  return (
    <>
      <Nav />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<MerchantBrowser />} />
          <Route path="/categories" element={<CategoryManager />} />
        </Routes>
      </main>
    </>
  )
}
