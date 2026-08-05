import { useState, useMemo } from 'react'
import merchants from './merchants.json'

const ALL_CATEGORIES = [...new Set(
  merchants.flatMap(m => m.categories ? m.categories.split(',').map(c => c.trim()) : [])
)].sort()

function formatRate(rate) {
  if (!rate || rate === 0) return null
  const pct = (rate * 100).toFixed(1)
  return `${pct}%`
}

function MerchantCard({ merchant }) {
  const cats = merchant.categories
    ? merchant.categories.split(',').map(c => c.trim()).filter(Boolean)
    : []
  const primary = merchant.primary_category?.trim()
  const rate = formatRate(merchant.default_rate)

  return (
    <div className="card">
      <div className="card-header">
        <span className="merchant-name">{merchant.name}</span>
        {rate && <span className="rate-badge">{rate}</span>}
      </div>
      {merchant.url && (
        <a className="merchant-url" href={merchant.url} target="_blank" rel="noopener noreferrer">
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
    </div>
  )
}

export default function App() {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return merchants.filter(m => {
      const matchesSearch = !q || m.name.toLowerCase().includes(q) || (m.url || '').toLowerCase().includes(q)
      const matchesCat = !selectedCategory || (m.categories || '').split(',').map(c => c.trim()).includes(selectedCategory)
      return matchesSearch && matchesCat
    })
  }, [search, selectedCategory])

  return (
    <>
      <div className="header">
        <h1>Merchant Browser</h1>
        <p>{merchants.length.toLocaleString()} active merchants</p>
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
          {ALL_CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <span className="results-count">
          {filtered.length.toLocaleString()} result{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid">
        {filtered.length > 0
          ? filtered.map(m => <MerchantCard key={m.id} merchant={m} />)
          : (
            <div className="empty-state">
              <h2>No merchants found</h2>
              <p>Try a different search or category filter.</p>
            </div>
          )
        }
      </div>
    </>
  )
}
