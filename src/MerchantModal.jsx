import { useState, useEffect } from 'react'
import {
  saveCategories, fetchCategories, fetchTags, saveMerchantTags,
  fetchSubcategories, fetchOccasionTags, fetchAudienceTags, fetchBusinessModelTags,
  saveMerchantSubcategories, saveMerchantOccasionTags, saveMerchantAudienceTags, saveMerchantBusinessModelTags,
} from './api'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const LEGACY_TAG_TYPES = ['occasion', 'seasonal', 'audience']
const NEW_TAG_SECTIONS = ['occasion', 'audience', 'business-model']

function SortableTag({ id, isPrimary, onRemove, onSetPrimary }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, cursor: 'grab' }

  return (
    <div ref={setNodeRef} style={style} className={`modal-tag${isPrimary ? ' primary' : ''}`}>
      <span {...attributes} {...listeners} className="drag-handle" title="Drag to reorder">⠿</span>
      <button className="tag-primary-btn" onClick={onSetPrimary} title={isPrimary ? 'Primary category' : 'Set as primary'}>
        {id}
      </button>
      <button className="tag-remove-btn" onClick={onRemove} title="Remove category">×</button>
    </div>
  )
}

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

export default function MerchantModal({ merchant, onClose, onSave }) {
  const [categories, setCategories] = useState([])
  const [primaryCategory, setPrimaryCategory] = useState('')
  const [addCatValue, setAddCatValue] = useState('')
  const [allCategoryNames, setAllCategoryNames] = useState([])

  // Legacy tags
  const [selectedTagIds, setSelectedTagIds] = useState(new Set())
  const [allTags, setAllTags] = useState([])
  const [addTagType, setAddTagType] = useState('occasion')

  // New taxonomy
  const [allSubcategories, setAllSubcategories] = useState([])
  const [selectedSubcategoryIds, setSelectedSubcategoryIds] = useState(new Set())
  const [allOccasionTags, setAllOccasionTags] = useState([])
  const [allAudienceTags, setAllAudienceTags] = useState([])
  const [allBizTags, setAllBizTags] = useState([])
  const [selectedOccasionIds, setSelectedOccasionIds] = useState(new Set())
  const [selectedAudienceIds, setSelectedAudienceIds] = useState(new Set())
  const [selectedBizIds, setSelectedBizIds] = useState(new Set())
  const [newTagSection, setNewTagSection] = useState('occasion')

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  // Load global lists once
  useEffect(() => {
    fetchCategories().then(setAllCategoryNames).catch(() => {})
    fetchTags().then(setAllTags).catch(() => {})
    fetchSubcategories().then(setAllSubcategories).catch(() => {})
    fetchOccasionTags().then(setAllOccasionTags).catch(() => {})
    fetchAudienceTags().then(setAllAudienceTags).catch(() => {})
    fetchBusinessModelTags().then(setAllBizTags).catch(() => {})
  }, [])

  // Populate from merchant data when modal opens
  useEffect(() => {
    if (!merchant) return
    const cats = merchant.categories
      ? merchant.categories.split(',').map(c => c.trim()).filter(Boolean)
      : []
    setCategories(cats)
    setPrimaryCategory(merchant.primary_category?.trim() || '')

    // Parse legacy tags from the "name|type,name|type" string
    const tagSet = new Set()
    if (merchant.tags) {
      merchant.tags.split(',').forEach(entry => {
        const [name] = entry.split('|')
        const tag = allTags.find(t => t.name === name.trim())
        if (tag) tagSet.add(tag.id)
      })
    }
    setSelectedTagIds(tagSet)

    // Parse new taxonomy from comma-separated name strings
    const parseNames = (str, list) => {
      const names = str ? str.split(',').map(s => s.trim()).filter(Boolean) : []
      return new Set(list.filter(t => names.includes(t.name)).map(t => t.id))
    }
    setSelectedSubcategoryIds(parseNames(merchant.new_subcategories, allSubcategories))
    setSelectedOccasionIds(parseNames(merchant.occasion_tags, allOccasionTags))
    setSelectedAudienceIds(parseNames(merchant.audience_tags, allAudienceTags))
    setSelectedBizIds(parseNames(merchant.business_model_tags, allBizTags))
  }, [merchant, allTags, allSubcategories, allOccasionTags, allAudienceTags, allBizTags])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  if (!merchant) return null

  // ── Category helpers ──
  function handleDragEnd(event) {
    const { active, over } = event
    if (active.id !== over?.id) {
      setCategories(prev => {
        const oldIndex = prev.indexOf(active.id)
        const newIndex = prev.indexOf(over.id)
        return arrayMove(prev, oldIndex, newIndex)
      })
    }
  }

  function removeCategory(cat) {
    setCategories(prev => prev.filter(c => c !== cat))
    if (primaryCategory === cat) setPrimaryCategory('')
  }

  function addCategory() {
    if (!addCatValue || categories.includes(addCatValue)) return
    setCategories(prev => [...prev, addCatValue])
    setAddCatValue('')
  }

  // ── Tag helpers ──
  function toggleTag(id) {
    setSelectedTagIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSet(setter, id) {
    setter(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const tagsByType = LEGACY_TAG_TYPES.map(type => ({
    type,
    tags: allTags.filter(t => t.type === type),
  }))

  // Group subcategories by top category for display
  const subcatsByTop = allSubcategories.reduce((acc, s) => {
    const key = s.top_category_name
    if (!acc[key]) acc[key] = []
    acc[key].push(s)
    return acc
  }, {})

  // ── Save ──
  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      await Promise.all([
        saveCategories(merchant.id, categories, primaryCategory),
        saveMerchantTags(merchant.id, [...selectedTagIds]),
        saveMerchantSubcategories(merchant.id, [...selectedSubcategoryIds]),
        saveMerchantOccasionTags(merchant.id, [...selectedOccasionIds]),
        saveMerchantAudienceTags(merchant.id, [...selectedAudienceIds]),
        saveMerchantBusinessModelTags(merchant.id, [...selectedBizIds]),
      ])

      // Rebuild denormalized strings for the card
      const assignedTags = allTags.filter(t => selectedTagIds.has(t.id))
      const tagsStr = assignedTags.map(t => `${t.name}|${t.type}`).join(',')
      const assignedSubs = allSubcategories.filter(s => selectedSubcategoryIds.has(s.id))
      const subNames = assignedSubs.map(s => s.name).join(',')
      const topNames = [...new Set(assignedSubs.map(s => s.top_category_name))].join(',')
      const occNames = allOccasionTags.filter(t => selectedOccasionIds.has(t.id)).map(t => t.name).join(',')
      const audNames = allAudienceTags.filter(t => selectedAudienceIds.has(t.id)).map(t => t.name).join(',')
      const bizNames = allBizTags.filter(t => selectedBizIds.has(t.id)).map(t => t.name).join(',')

      onSave({
        ...merchant,
        categories: categories.join(','),
        primary_category: primaryCategory,
        tags: tagsStr,
        new_subcategories: subNames,
        new_top_categories: topNames,
        occasion_tags: occNames,
        audience_tags: audNames,
        business_model_tags: bizNames,
      })
      onClose()
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const rate = (r) => r && r !== 0 ? `${(r * 100).toFixed(2)}%` : '—'
  const availableToAdd = allCategoryNames.filter(c => !categories.includes(c))

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{merchant.name}</h2>
            {merchant.url && (
              <a className="modal-url" href={merchant.url} target="_blank" rel="noopener noreferrer">
                {merchant.url}
              </a>
            )}
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Details */}
          <div className="modal-section">
            <h3>Details</h3>
            <div className="detail-grid">
              <DetailRow label="Merchant ID" value={merchant.id} />
              <DetailRow label="Networks" value={merchant.networks} />
              <DetailRow label="Default rate" value={rate(merchant.default_rate)} />
              <DetailRow label="Derived rate" value={rate(merchant.derived_rate)} />
              <DetailRow label="Admin rate" value={rate(merchant.admin_rate)} />
              <DetailRow label="Domain ranking" value={merchant.domain_ranking} />
              <DetailRow label="Redirect code" value={merchant.redirect_code} />
              {merchant.note && <DetailRow label="Note" value={merchant.note} />}
            </div>
            <div className="flags">
              <Flag label="ITP Compliant" value={merchant.is_itp_compliant} />
              <Flag label="Delinquent" value={merchant.is_delinquent} />
              <Flag label="Deeplink Disabled" value={merchant.deeplink_disabled} />
              <Flag label="Coupon Disabled" value={merchant.coupon_disabled} />
              <Flag label="Existing Customer Rate Disabled" value={merchant.existing_customer_rate_disabled} />
            </div>
          </div>

          {/* Categories */}
          <div className="modal-section">
            <div className="section-header">
              <h3>Categories</h3>
              <span className="section-hint">Drag to reorder · Click name to set primary</span>
            </div>
            {categories.length > 0 ? (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={categories} strategy={horizontalListSortingStrategy}>
                  <div className="modal-tags">
                    {categories.map(cat => (
                      <SortableTag
                        key={cat}
                        id={cat}
                        isPrimary={cat === primaryCategory}
                        onRemove={() => removeCategory(cat)}
                        onSetPrimary={() => setPrimaryCategory(cat === primaryCategory ? '' : cat)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <p className="no-cats-msg">No categories assigned.</p>
            )}
            <div className="add-category">
              <select className="category-select" value={addCatValue} onChange={e => setAddCatValue(e.target.value)}>
                <option value="">Add a category...</option>
                {availableToAdd.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button className="add-btn" onClick={addCategory} disabled={!addCatValue}>Add</button>
            </div>
          </div>

          {/* New Taxonomy — Subcategories */}
          <div className="modal-section">
            <div className="section-header">
              <h3>Category</h3>
              <span className="section-hint">New taxonomy — select one or more subcategories</span>
            </div>
            {Object.entries(subcatsByTop).map(([topName, subs]) => (
              <div key={topName} className="subcat-group">
                <div className="subcat-group-label">{topName}</div>
                <div className="tag-toggle-grid">
                  {subs.map(s => (
                    <button
                      key={s.id}
                      className={`tag-toggle new-sub-cat${selectedSubcategoryIds.has(s.id) ? ' selected' : ''}`}
                      onClick={() => toggleSet(setSelectedSubcategoryIds, s.id)}
                    >
                      {selectedSubcategoryIds.has(s.id) && <span className="check">✓</span>}
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* New Taxonomy — Occasion / Audience / Business Model Tags */}
          <div className="modal-section">
            <div className="section-header">
              <h3>New Tags</h3>
              <span className="section-hint">Occasion · Audience · Business Model</span>
            </div>
            <div className="tag-type-tabs">
              {[
                { key: 'occasion', label: 'Occasion', list: allOccasionTags, sel: selectedOccasionIds },
                { key: 'audience', label: 'Audience', list: allAudienceTags, sel: selectedAudienceIds },
                { key: 'business-model', label: 'Business Model', list: allBizTags, sel: selectedBizIds },
              ].map(({ key, label, sel }) => (
                <button
                  key={key}
                  className={`tag-type-tab ${key}${newTagSection === key ? ' active' : ''}`}
                  onClick={() => setNewTagSection(key)}
                >
                  {label}
                  {' '}<span className="tab-count">{sel.size || ''}</span>
                </button>
              ))}
            </div>
            {newTagSection === 'occasion' && (
              <div className="tag-toggle-grid">
                {allOccasionTags.map(t => (
                  <button
                    key={t.id}
                    className={`tag-toggle occasion${selectedOccasionIds.has(t.id) ? ' selected' : ''}`}
                    onClick={() => toggleSet(setSelectedOccasionIds, t.id)}
                  >
                    {selectedOccasionIds.has(t.id) && <span className="check">✓</span>}
                    {t.name}
                  </button>
                ))}
              </div>
            )}
            {newTagSection === 'audience' && (
              <div className="tag-toggle-grid">
                {allAudienceTags.map(t => (
                  <button
                    key={t.id}
                    className={`tag-toggle audience${selectedAudienceIds.has(t.id) ? ' selected' : ''}`}
                    onClick={() => toggleSet(setSelectedAudienceIds, t.id)}
                  >
                    {selectedAudienceIds.has(t.id) && <span className="check">✓</span>}
                    {t.name}
                  </button>
                ))}
              </div>
            )}
            {newTagSection === 'business-model' && (
              <div className="tag-toggle-grid">
                {allBizTags.map(t => (
                  <button
                    key={t.id}
                    className={`tag-toggle business-model${selectedBizIds.has(t.id) ? ' selected' : ''}`}
                    onClick={() => toggleSet(setSelectedBizIds, t.id)}
                  >
                    {selectedBizIds.has(t.id) && <span className="check">✓</span>}
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Legacy Tags */}
          <div className="modal-section">
            <div className="section-header">
              <h3>Legacy Tags</h3>
              <span className="section-hint">Old system · manage in Tag Manager</span>
            </div>
            <div className="tag-type-tabs">
              {LEGACY_TAG_TYPES.map(type => (
                <button
                  key={type}
                  className={`tag-type-tab ${type}${addTagType === type ? ' active' : ''}`}
                  onClick={() => setAddTagType(type)}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                  {' '}
                  <span className="tab-count">
                    {allTags.filter(t => t.type === type && selectedTagIds.has(t.id)).length || ''}
                  </span>
                </button>
              ))}
            </div>
            <div className="tag-toggle-grid">
              {(tagsByType.find(g => g.type === addTagType)?.tags || []).map(tag => (
                <button
                  key={tag.id}
                  className={`tag-toggle ${tag.type}${selectedTagIds.has(tag.id) ? ' selected' : ''}`}
                  onClick={() => toggleTag(tag.id)}
                >
                  {selectedTagIds.has(tag.id) && <span className="check">✓</span>}
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          {saveError && <span className="save-error">{saveError}</span>}
          <button className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
