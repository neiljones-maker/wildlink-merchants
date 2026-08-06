import { useState, useEffect, useMemo } from 'react'
import MerchantModal from './MerchantModal'

const CONFIDENCE_ORDER = { null: 0, undefined: 0, '': 0, Low: 1, Medium: 2 }
const CONFIDENCE_COLOR = { Low: 'conf-low', Medium: 'conf-medium' }

async function fetchReviewMerchants() {
  const res = await fetch('/api/review-merchants')
  if (!res.ok) throw new Error('Failed to load review merchants')
  return res.json()
}

function ConfidenceBadge({ confidence }) {
  if (!confidence) return <span className="conf-badge conf-none">Unassigned</span>
  return <span className={`conf-badge ${CONFIDENCE_COLOR[confidence] || ''}`}>{confidence}</span>
}

export default function ReviewPage() {
  const [merchants, setMerchants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [activeMerchant, setActiveMerchant] = useState(null)

  useEffect(() => {
    fetchReviewMerchants()
      .then(data => { setMerchants(data); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [])

  function handleSave(updated) {
    // Remove from review list if now has a high-confidence subcategory
    setMerchants(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m))
    setActiveMerchant(null)
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return merchants.filter(m => {
      const matchSearch = !q || m.name.toLowerCase().includes(q) || (m.new_top_category || '').toLowerCase().includes(q) || (m.new_subcategory || '').toLowerCase().includes(q)
      const matchFilter =
        filter === 'all' ||
        (filter === 'unassigned' && !m.new_subcategory) ||
        (filter === 'low' && m.confidence === 'Low') ||
        (filter === 'medium' && m.confidence === 'Medium')
      return matchSearch && matchFilter
    })
  }, [merchants, search, filter])

  const counts = useMemo(() => ({
    unassigned: merchants.filter(m => !m.new_subcategory).length,
    low: merchants.filter(m => m.confidence === 'Low').length,
    medium: merchants.filter(m => m.confidence === 'Medium').length,
  }), [merchants])

  if (loading) return <div className="loading">Loading review queue…</div>
  if (error) return <div className="loading error">Error: {error}</div>

  return (
    <>
      <div className="header">
        <h1>Review Queue</h1>
        <p>{merchants.length} merchants need attention</p>
      </div>

      <div className="controls">
        <input
          className="search-input"
          type="search"
          placeholder="Search by name or category…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="filter-tabs">
          {[
            ['all', `All (${merchants.length})`],
            ['unassigned', `Unassigned (${counts.unassigned})`],
            ['low', `Low confidence (${counts.low})`],
            ['medium', `Medium confidence (${counts.medium})`],
          ].map(([val, label]) => (
            <button
              key={val}
              className={`filter-tab${filter === val ? ' active' : ''}`}
              onClick={() => setFilter(val)}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="results-count">{filtered.length.toLocaleString()} shown</span>
      </div>

      <div className="review-table">
        <div className="review-table-header">
          <div>Merchant</div>
          <div>Current Category</div>
          <div>Confidence</div>
          <div>Reason</div>
          <div></div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px', textAlign: 'center' }}>
            <h2>No merchants match</h2>
          </div>
        ) : filtered.map(m => (
          <div key={m.id} className="review-row">
            <div className="review-merchant-col">
              <span className="review-name">{m.name}</span>
              {m.url && <span className="review-url">{m.url.replace(/^https?:\/\//, '')}</span>}
            </div>
            <div className="review-cat-col">
              {m.new_subcategory ? (
                <>
                  <span className="review-top-cat">{m.new_top_category}</span>
                  <span className="review-sub-cat">{m.new_subcategory}</span>
                </>
              ) : (
                <span className="review-none">Not assigned</span>
              )}
            </div>
            <div className="review-conf-col">
              <ConfidenceBadge confidence={m.confidence} />
            </div>
            <div className="review-basis-col">
              <span className="review-basis">{m.basis || '—'}</span>
            </div>
            <div className="review-action-col">
              <button
                className="action-btn primary"
                onClick={() => setActiveMerchant(m)}
              >
                Reassign
              </button>
            </div>
          </div>
        ))}
      </div>

      <MerchantModal
        merchant={activeMerchant}
        onClose={() => setActiveMerchant(null)}
        onSave={handleSave}
      />
    </>
  )
}
