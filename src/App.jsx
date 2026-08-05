import { useState, useMemo, useEffect } from 'react'
import MerchantModal from './MerchantModal'
import { fetchMerchants } from './api'

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

export default function App() {
  const [merchantData, setMerchantData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [activeMerchant, setActiveMerchant] = useState(null)

  useEffect(() => {
    fetchMerchants()
      .then(data => { setMerchantData(data); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [])

  const allCategories = useMemo(() => buildCategoryList(merchantData), [merchantData])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return merchantData.filter(m => {
      const matchesSearch = !q || m.name.toLowerCase().includes(q) || (m.url || '').toLowerCase().includes(q)
      const matchesCat = !selectedCategory || (m.categories || '').split(',').map(c => c.trim()).includes(selectedCategory)
      return matchesSearch && matchesCat
    })
  }, [merchantData, search, selectedCategory])

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
        {filtered.length > 0
          ? filtered.map(m => (
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

      <MerchantModal
        merchant={activeMerchant}
        onClose={() => setActiveMerchant(null)}
        onSave={handleSave}
      />
    </>
  )
}
