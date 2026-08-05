import { useState, useEffect } from 'react'
import { saveCategories, fetchCategories, fetchTags, saveMerchantTags } from './api'
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

const TAG_TYPES = ['occasion', 'seasonal', 'audience']

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

  const [selectedTagIds, setSelectedTagIds] = useState(new Set())
  const [allTags, setAllTags] = useState([])
  const [addTagType, setAddTagType] = useState('occasion')

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  // Load global lists once
  useEffect(() => {
    fetchCategories().then(setAllCategoryNames).catch(() => {})
    fetchTags().then(setAllTags).catch(() => {})
  }, [])

  // Populate from merchant data when modal opens
  useEffect(() => {
    if (!merchant) return
    const cats = merchant.categories
      ? merchant.categories.split(',').map(c => c.trim()).filter(Boolean)
      : []
    setCategories(cats)
    setPrimaryCategory(merchant.primary_category?.trim() || '')

    // Parse tags from the "name|type,name|type" string
    const tagSet = new Set()
    if (merchant.tags) {
      merchant.tags.split(',').forEach(entry => {
        const [name] = entry.split('|')
        const tag = allTags.find(t => t.name === name.trim())
        if (tag) tagSet.add(tag.id)
      })
    }
    setSelectedTagIds(tagSet)
  }, [merchant, allTags])

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

  const tagsByType = TAG_TYPES.map(type => ({
    type,
    tags: allTags.filter(t => t.type === type),
  }))

  // ── Save ──
  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      await Promise.all([
        saveCategories(merchant.id, categories, primaryCategory),
        saveMerchantTags(merchant.id, [...selectedTagIds]),
      ])

      // Rebuild tags string for the card
      const assignedTags = allTags.filter(t => selectedTagIds.has(t.id))
      const tagsStr = assignedTags.map(t => `${t.name}|${t.type}`).join(',')

      onSave({
        ...merchant,
        categories: categories.join(','),
        primary_category: primaryCategory,
        tags: tagsStr,
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

          {/* Tags */}
          <div className="modal-section">
            <div className="section-header">
              <h3>Tags</h3>
              <span className="section-hint">Toggle to assign · manage all tags in Tag Manager</span>
            </div>
            <div className="tag-type-tabs">
              {TAG_TYPES.map(type => (
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
