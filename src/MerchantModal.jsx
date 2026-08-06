import { useState, useEffect, useRef } from 'react'
import {
  fetchOccasionTags, fetchAudienceTags, fetchBusinessModelTags,
  fetchSubcategories, fetchCategoryTop,
  saveMerchantSubcategories, saveMerchantOccasionTags, saveMerchantAudienceTags, saveMerchantBusinessModelTags,
  createOccasionTag, createAudienceTag, createBusinessModelTag,
} from './api'

// ── Searchable dropdown (single + multi) ──────────────────────────────────

function SearchableSelect({ value, onChange, groups, placeholder, multi = false }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    function outside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', outside)
    return () => document.removeEventListener('mousedown', outside)
  }, [])

  useEffect(() => {
    if (open) { setQuery(''); setTimeout(() => inputRef.current?.focus(), 0) }
  }, [open])

  const q = query.toLowerCase()
  const filtered = groups
    .map(g => ({ ...g, options: g.options.filter(o => !q || o.label.toLowerCase().includes(q)) }))
    .filter(g => g.options.length > 0)

  const allOptions = groups.flatMap(g => g.options)

  function isSelected(val) {
    return multi ? (value instanceof Set ? value.has(val) : false) : val === value
  }

  function select(val) {
    if (multi) {
      const next = new Set(value instanceof Set ? value : [])
      next.has(val) ? next.delete(val) : next.add(val)
      onChange(next)
      // keep open for multi-select
    } else {
      onChange(val)
      setOpen(false)
    }
  }

  // Trigger label
  let triggerLabel = ''
  if (multi) {
    const count = value instanceof Set ? value.size : 0
    triggerLabel = count === 0 ? '' : count === 1
      ? allOptions.find(o => o.value === [...value][0])?.label || `${count} selected`
      : `${count} subcategories selected`
  } else {
    triggerLabel = allOptions.find(o => o.value === value)?.label || ''
  }

  return (
    <div className="ss-wrap" ref={containerRef}>
      <button type="button" className={`ss-trigger${open ? ' open' : ''}`} onClick={() => setOpen(v => !v)}>
        <span className={triggerLabel ? '' : 'ss-placeholder'}>{triggerLabel || placeholder}</span>
        <span className="ss-arrow">{open ? '▴' : '▾'}</span>
      </button>

      {/* Selected chips for multi */}
      {multi && value instanceof Set && value.size > 0 && (
        <div className="ss-chips">
          {[...value].map(id => {
            const opt = allOptions.find(o => o.value === id)
            return opt ? (
              <span key={id} className="ss-chip">
                {opt.label}
                <button
                  className="ss-chip-remove"
                  onClick={e => { e.stopPropagation(); select(id) }}
                  title="Remove"
                >×</button>
              </span>
            ) : null
          })}
        </div>
      )}

      {open && (
        <div className="ss-dropdown">
          <div className="ss-search-wrap">
            <input ref={inputRef} className="ss-search" placeholder="Search…" value={query} onChange={e => setQuery(e.target.value)} />
          </div>
          <div className="ss-options">
            {!multi && (
              <div className={`ss-option${!value ? ' selected' : ''}`} onClick={() => select('')}>{placeholder}</div>
            )}
            {filtered.map(g => (
              <div key={g.label}>
                {g.label && <div className="ss-group-label">{g.label}</div>}
                {g.options.map(o => (
                  <div key={o.value} className={`ss-option${isSelected(o.value) ? ' selected' : ''}`} onClick={() => select(o.value)}>
                    {isSelected(o.value) && <span className="ss-check">✓ </span>}
                    {o.label}
                  </div>
                ))}
              </div>
            ))}
            {filtered.length === 0 && <div className="ss-empty">No matches for "{query}"</div>}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Detail helpers ─────────────────────────────────────────────────────────

function DetailRow({ label, value }) {
  if (value === null || value === undefined || value === '' || value === '0' || value === 0) return null
  return (
    <div className="detail-row">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value}</span>
    </div>
  )
}

function Flag({ label, value }) {
  if (value !== 't' && value !== true) return null
  return <span className="flag-badge">{label}</span>
}

// ── Create-tag inline form ─────────────────────────────────────────────────

function CreateTagForm({ tabKey, onCreate }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)

  async function handleCreate() {
    if (!name.trim()) return
    setBusy(true)
    try {
      let tag
      if (tabKey === 'occasion') tag = await createOccasionTag(name.trim())
      else if (tabKey === 'audience') tag = await createAudienceTag(name.trim())
      else if (tabKey === 'business-model') tag = await createBusinessModelTag(name.trim())
      if (tag) onCreate(tag)
      setName('')
      setOpen(false)
    } finally { setBusy(false) }
  }

  if (!open) return <button className="create-tag-btn" onClick={() => setOpen(true)}>+ Create tag</button>
  return (
    <div className="create-tag-form">
      <input className="tag-edit-input" placeholder="New tag name…" value={name} autoFocus
        onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setOpen(false) }} />
      <button className="icon-btn save" onClick={handleCreate} disabled={busy || !name.trim()} title="Create">✓</button>
      <button className="icon-btn" onClick={() => setOpen(false)} title="Cancel">✕</button>
    </div>
  )
}

// ── Main modal ─────────────────────────────────────────────────────────────

export default function MerchantModal({ merchant, onClose, onSave }) {
  const [allCategoryTop, setAllCategoryTop]     = useState([])
  const [allSubcategories, setAllSubcategories] = useState([])
  const [allOccasionTags, setAllOccasionTags]   = useState([])
  const [allAudienceTags, setAllAudienceTags]   = useState([])
  const [allBizTags, setAllBizTags]             = useState([])

  const [selectedTopId, setSelectedTopId]             = useState('')
  const [selectedSubIds, setSelectedSubIds]           = useState(new Set())
  const [selectedOccasionIds, setSelectedOccasionIds] = useState(new Set())
  const [selectedAudienceIds, setSelectedAudienceIds] = useState(new Set())
  const [selectedBizIds, setSelectedBizIds]           = useState(new Set())
  const [activeTagTab, setActiveTagTab] = useState('occasion')

  const [saving, setSaving]     = useState(false)
  const [saveError, setSaveError] = useState(null)

  const populatedRef = useRef(null)

  // Body scroll lock
  useEffect(() => {
    if (!merchant) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [!!merchant])

  // Load reference lists once
  useEffect(() => {
    fetchCategoryTop().then(setAllCategoryTop).catch(() => {})
    fetchSubcategories().then(setAllSubcategories).catch(() => {})
    fetchOccasionTags().then(setAllOccasionTags).catch(() => {})
    fetchAudienceTags().then(setAllAudienceTags).catch(() => {})
    fetchBusinessModelTags().then(setAllBizTags).catch(() => {})
  }, [])

  // Populate from merchant — ref guard prevents overwriting user changes
  useEffect(() => {
    if (!merchant) { populatedRef.current = null; return }
    if (populatedRef.current === merchant.id) return
    if (!allSubcategories.length && !allOccasionTags.length) return

    populatedRef.current = merchant.id

    // Subcategories (multi)
    const subNames = merchant.new_subcategories
      ? merchant.new_subcategories.split(',').map(s => s.trim()).filter(Boolean)
      : []
    const matchedSubs = allSubcategories.filter(s => subNames.includes(s.name))
    const subIdSet = new Set(matchedSubs.map(s => s.id))
    setSelectedSubIds(subIdSet)

    // Infer top category from first matched sub
    const firstSub = matchedSubs[0]
    setSelectedTopId(firstSub?.top_category_id ?? '')

    // Tags
    const parseNames = (str, list) => {
      const names = str ? str.split(',').map(s => s.trim()).filter(Boolean) : []
      return new Set(list.filter(t => names.includes(t.name)).map(t => t.id))
    }
    setSelectedOccasionIds(parseNames(merchant.occasion_tags, allOccasionTags))
    setSelectedAudienceIds(parseNames(merchant.audience_tags, allAudienceTags))
    setSelectedBizIds(parseNames(merchant.business_model_tags, allBizTags))
  }, [merchant, allSubcategories, allOccasionTags, allAudienceTags, allBizTags])

  if (!merchant) return null

  // ── Category helpers ──

  function handleTopChange(topId) {
    const id = topId ? Number(topId) : ''
    setSelectedTopId(id)
    // Remove subcategories that don't belong to new top
    if (id) {
      setSelectedSubIds(prev => {
        const next = new Set()
        for (const sid of prev) {
          const sub = allSubcategories.find(s => s.id === sid)
          if (sub && sub.top_category_id === id) next.add(sid)
        }
        return next
      })
    }
  }

  function handleSubChange(newSet) {
    setSelectedSubIds(newSet)
    // sync top from first selected sub
    const first = [...newSet][0]
    if (first) {
      const sub = allSubcategories.find(s => s.id === first)
      if (sub) setSelectedTopId(sub.top_category_id)
    } else {
      setSelectedTopId('')
    }
  }

  // Build subcategory groups for the SearchableSelect
  const subcatsByTop = allSubcategories.reduce((acc, s) => {
    if (!acc[s.top_category_name]) acc[s.top_category_name] = []
    acc[s.top_category_name].push(s)
    return acc
  }, {})

  const subcatGroups = selectedTopId
    ? [{
        label: allCategoryTop.find(ct => ct.id === selectedTopId)?.name || '',
        options: allSubcategories.filter(s => s.top_category_id === selectedTopId).map(s => ({ value: s.id, label: s.name })),
      }]
    : Object.entries(subcatsByTop).map(([label, subs]) => ({
        label,
        options: subs.map(s => ({ value: s.id, label: s.name })),
      }))

  const topGroups = [{ label: '', options: allCategoryTop.map(ct => ({ value: ct.id, label: ct.name })) }]

  const TAG_TABS = [
    { key: 'occasion',       label: 'Occasion',       list: allOccasionTags, setList: setAllOccasionTags, sel: selectedOccasionIds, setSel: setSelectedOccasionIds },
    { key: 'audience',       label: 'Audience',       list: allAudienceTags, setList: setAllAudienceTags, sel: selectedAudienceIds, setSel: setSelectedAudienceIds },
    { key: 'business-model', label: 'Business Model', list: allBizTags,      setList: setAllBizTags,      sel: selectedBizIds,      setSel: setSelectedBizIds },
  ]
  const activeTab = TAG_TABS.find(t => t.key === activeTagTab)

  function toggleSet(setter, id) {
    setter(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  // ── Save ──

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      await Promise.all([
        saveMerchantSubcategories(merchant.id, [...selectedSubIds]),
        saveMerchantOccasionTags(merchant.id, [...selectedOccasionIds]),
        saveMerchantAudienceTags(merchant.id, [...selectedAudienceIds]),
        saveMerchantBusinessModelTags(merchant.id, [...selectedBizIds]),
      ])

      const assignedSubs = allSubcategories.filter(s => selectedSubIds.has(s.id))
      const topNames = [...new Set(assignedSubs.map(s => s.top_category_name))].join(',')

      onSave({
        ...merchant,
        new_subcategories:   assignedSubs.map(s => s.name).join(','),
        new_top_categories:  topNames,
        occasion_tags:       allOccasionTags.filter(t => selectedOccasionIds.has(t.id)).map(t => t.name).join(','),
        audience_tags:       allAudienceTags.filter(t => selectedAudienceIds.has(t.id)).map(t => t.name).join(','),
        business_model_tags: allBizTags.filter(t => selectedBizIds.has(t.id)).map(t => t.name).join(','),
      })
      onClose()
    } catch (err) {
      setSaveError(err.message)
      setSaving(false)
    }
  }

  const rate = (r) => r && r !== 0 ? `${(r * 100).toFixed(2)}%` : '—'

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">

        {/* Header with Save/Cancel top-right */}
        <div className="modal-header">
          <div className="modal-header-info">
            <h2 className="modal-title">{merchant.name}</h2>
            {merchant.url && (
              <a className="modal-url" href={merchant.url} target="_blank" rel="noopener noreferrer">{merchant.url}</a>
            )}
          </div>
          <div className="modal-header-actions">
            {saveError && <span className="save-error">{saveError}</span>}
            <button className="btn-secondary btn-sm" onClick={onClose} disabled={saving}>Cancel</button>
            <button className="btn-primary btn-sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="modal-body">

          {/* Details */}
          <div className="modal-section">
            <h3>Details</h3>
            <div className="detail-grid">
              <DetailRow label="Merchant ID" value={merchant.id} />
              <DetailRow label="Networks"    value={merchant.networks} />
              <DetailRow label="Default rate" value={rate(merchant.default_rate)} />
              <DetailRow label="Derived rate" value={rate(merchant.derived_rate)} />
              <DetailRow label="Admin rate"   value={rate(merchant.admin_rate)} />
              <DetailRow label="Domain ranking" value={merchant.domain_ranking} />
              <DetailRow label="Redirect code"  value={merchant.redirect_code} />
              {merchant.note && <DetailRow label="Note" value={merchant.note} />}
            </div>
            <div className="flags">
              <Flag label="ITP Compliant"                   value={merchant.is_itp_compliant} />
              <Flag label="Delinquent"                      value={merchant.is_delinquent} />
              <Flag label="Deeplink Disabled"               value={merchant.deeplink_disabled} />
              <Flag label="Coupon Disabled"                 value={merchant.coupon_disabled} />
              <Flag label="Existing Customer Rate Disabled" value={merchant.existing_customer_rate_disabled} />
            </div>
          </div>

          {/* Primary Category */}
          <div className="modal-section">
            <div className="section-header">
              <h3>Primary Category</h3>
              <span className="section-hint">Filters subcategory choices below</span>
            </div>
            <SearchableSelect
              value={selectedTopId}
              onChange={handleTopChange}
              groups={topGroups}
              placeholder="No primary category"
            />
          </div>

          {/* Subcategories — multi-select */}
          <div className="modal-section">
            <div className="section-header">
              <h3>Subcategory</h3>
              <span className="section-hint">Select one or more</span>
            </div>
            <SearchableSelect
              value={selectedSubIds}
              onChange={handleSubChange}
              groups={subcatGroups}
              placeholder="No subcategory assigned"
              multi
            />
          </div>

          {/* Tags */}
          <div className="modal-section">
            <div className="section-header"><h3>Tags</h3></div>
            <div className="tag-type-tabs">
              {TAG_TABS.map(({ key, label, sel }) => (
                <button key={key}
                  className={`tag-type-tab ${key}${activeTagTab === key ? ' active' : ''}`}
                  onClick={() => setActiveTagTab(key)}
                >
                  {label}{' '}<span className="tab-count">{sel.size || ''}</span>
                </button>
              ))}
            </div>
            {activeTab && (
              <>
                <div className="tag-toggle-grid">
                  {activeTab.list.map(t => (
                    <button key={t.id}
                      className={`tag-toggle ${activeTab.key}${activeTab.sel.has(t.id) ? ' selected' : ''}`}
                      onClick={() => toggleSet(activeTab.setSel, t.id)}
                    >
                      {activeTab.sel.has(t.id) && <span className="check">✓</span>}
                      {t.name}
                    </button>
                  ))}
                </div>
                <CreateTagForm
                  tabKey={activeTab.key}
                  onCreate={tag => {
                    activeTab.setList(prev => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)))
                    activeTab.setSel(prev => new Set([...prev, tag.id]))
                  }}
                />
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
