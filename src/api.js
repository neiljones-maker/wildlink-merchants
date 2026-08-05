export async function fetchMerchants() {
  const res = await fetch('/api/merchants')
  if (!res.ok) throw new Error('Failed to load merchants')
  return res.json()
}

export async function fetchCategories() {
  const res = await fetch('/api/categories')
  if (!res.ok) throw new Error('Failed to load categories')
  return res.json()
}

export async function fetchCategoryManage() {
  const res = await fetch('/api/categories/manage')
  if (!res.ok) throw new Error('Failed to load category data')
  return res.json()
}

export async function setCategoryParent(id, parentId) {
  const res = await fetch(`/api/categories/${id}/parent`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ parent_id: parentId || null }),
  })
  if (!res.ok) throw new Error('Failed to update category')
  return res.json()
}

export async function deleteCategory(id) {
  const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to remove category')
  return res.json()
}

// ── Tags ──────────────────────────────────────────────────────────────────────

export async function fetchTags(type) {
  const url = type ? `/api/tags?type=${encodeURIComponent(type)}` : '/api/tags'
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to load tags')
  return res.json()
}

export async function createTag(name, type) {
  const res = await fetch('/api/tags', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, type }),
  })
  if (!res.ok) throw new Error('Failed to create tag')
  return res.json()
}

export async function renameTag(id, name) {
  const res = await fetch(`/api/tags/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) throw new Error('Failed to rename tag')
  return res.json()
}

export async function deleteTag(id) {
  const res = await fetch(`/api/tags/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete tag')
  return res.json()
}

export async function saveMerchantTags(merchantId, tagIds) {
  const res = await fetch(`/api/merchants/${merchantId}/tags`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tag_ids: tagIds }),
  })
  if (!res.ok) throw new Error('Failed to save tags')
  return res.json()
}

// ── New taxonomy ──────────────────────────────────────────────────────────────

export async function fetchCategoryTop() {
  const res = await fetch('/api/category-top')
  if (!res.ok) throw new Error('Failed to load top categories')
  return res.json()
}

export async function fetchSubcategories() {
  const res = await fetch('/api/subcategories')
  if (!res.ok) throw new Error('Failed to load subcategories')
  return res.json()
}

export async function fetchOccasionTags() {
  const res = await fetch('/api/occasion-tags')
  if (!res.ok) throw new Error('Failed to load occasion tags')
  return res.json()
}

export async function fetchAudienceTags() {
  const res = await fetch('/api/audience-tags')
  if (!res.ok) throw new Error('Failed to load audience tags')
  return res.json()
}

export async function fetchBusinessModelTags() {
  const res = await fetch('/api/business-model-tags')
  if (!res.ok) throw new Error('Failed to load business model tags')
  return res.json()
}

export async function saveMerchantSubcategories(merchantId, subcategoryIds) {
  const res = await fetch(`/api/merchants/${merchantId}/subcategories`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subcategory_ids: subcategoryIds }),
  })
  if (!res.ok) throw new Error('Failed to save subcategories')
  return res.json()
}

export async function saveMerchantOccasionTags(merchantId, tagIds) {
  const res = await fetch(`/api/merchants/${merchantId}/occasion-tags`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tag_ids: tagIds }),
  })
  if (!res.ok) throw new Error('Failed to save occasion tags')
  return res.json()
}

export async function saveMerchantAudienceTags(merchantId, tagIds) {
  const res = await fetch(`/api/merchants/${merchantId}/audience-tags`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tag_ids: tagIds }),
  })
  if (!res.ok) throw new Error('Failed to save audience tags')
  return res.json()
}

export async function saveMerchantBusinessModelTags(merchantId, tagIds) {
  const res = await fetch(`/api/merchants/${merchantId}/business-model-tags`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tag_ids: tagIds }),
  })
  if (!res.ok) throw new Error('Failed to save business model tags')
  return res.json()
}

// ── Categories ────────────────────────────────────────────────────────────────

export async function saveCategories(merchantId, categories, primaryCategory) {
  const res = await fetch(`/api/merchants/${merchantId}/categories`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ categories, primary_category: primaryCategory }),
  })
  if (!res.ok) throw new Error('Failed to save categories')
  return res.json()
}
