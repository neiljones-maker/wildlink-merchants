import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { Routes, Route } from 'react-router-dom'
import MerchantModal from './MerchantModal'
import CategoryManager from './CategoryManager'
import TagManager from './TagManager'
import ReviewPage from './ReviewPage'
import Nav from './Nav'
import { fetchMerchants } from './api'

const PAGE_SIZE = 48

function buildCategoryList(data) {
  return [...new Set(
    data.flatMap(m => m.new_top_categories ? m.new_top_categories.split(',').map(c => c.trim()) : [])
  )].sort()
}

function formatRate(rate) {
  if (!rate || rate === 0) return null
  return `${(rate * 100).toFixed(1)}%`
}

function MerchantLogo({ url, name }) {
  const [err, setErr] = useState(false)
  const domain = url ? url.replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '') : ''
  const initial = name ? name.charAt(0).toUpperCase() : '?'
  // color from name hash for consistent letter avatars
  const hue = name ? [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360 : 0

  if (!domain || err) {
    return (
      <div className="card-logo-fallback" style={{ background: `hsl(${hue},55%,88%)`, color: `hsl(${hue},55%,35%)` }}>
        {initial}
      </div>
    )
  }
  return (
    <img
      className="card-logo"
      src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`}
      alt=""
      onError={() => setErr(true)}
    />
  )
}

function MerchantCard({ merchant, onClick }) {
  const rate = formatRate(merchant.default_rate)
  const subList = merchant.new_subcategories ? merchant.new_subcategories.split(',').map(s => s.trim()).filter(Boolean) : []
  const topList = merchant.new_top_categories ? merchant.new_top_categories.split(',').map(s => s.trim()).filter(Boolean) : []
  const domain = merchant.url ? merchant.url.replace(/^https?:\/\//, '').replace(/\/$/, '') : ''

  const allTags = [
    ...(merchant.occasion_tags ? merchant.occasion_tags.split(',').map(t => ({ name: t.trim(), type: 'occasion' })) : []),
    ...(merchant.audience_tags ? merchant.audience_tags.split(',').map(t => ({ name: t.trim(), type: 'audience' })) : []),
    ...(merchant.business_model_tags ? merchant.business_model_tags.split(',').map(t => ({ name: t.trim(), type: 'business-model' })) : []),
  ].filter(t => t.name)

  return (
    <div className="card" onClick={onClick} role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}>

      <div className="card-identity">
        <MerchantLogo url={merchant.url} name={merchant.name} />
        <div className="card-identity-text">
          <div className="card-title-row">
            <span className="merchant-name">{merchant.name}</span>
            {rate && <span className="rate-badge">{rate}</span>}
          </div>
          {domain && (
            <a className="merchant-url" href={merchant.url} target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}>
              {domain}
            </a>
          )}
        </div>
      </div>

      <div className="card-category">
        {subList.length > 0 ? (
          <div className="card-crumbs">
            {subList.map((sub, i) => (
              <span key={sub} className="card-cat-crumb">
                <span className="crumb-top">{topList[i] || topList[0]}</span>
                <span className="crumb-sep">›</span>
                <span className="crumb-sub">{sub}</span>
              </span>
            ))}
          </div>
        ) : (
          <span className="no-categories">Uncategorized</span>
        )}
      </div>

      {allTags.length > 0 && (
        <div className="card-tags">
          {allTags.map(t => (
            <span key={t.name + t.type} className={`tag-pill ${t.type}`}>{t.name}</span>
          ))}
        </div>
      )}
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
      const matchesCat = !selectedCategory || (m.new_top_categories || '').split(',').map(c => c.trim()).includes(selectedCategory)
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
          <Route path="/tags" element={<TagManager />} />
          <Route path="/review" element={<ReviewPage />} />
        </Routes>
      </main>
    </>
  )
}
