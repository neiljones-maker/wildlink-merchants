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

export async function saveCategories(merchantId, categories, primaryCategory) {
  const res = await fetch(`/api/merchants/${merchantId}/categories`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ categories, primary_category: primaryCategory }),
  })
  if (!res.ok) throw new Error('Failed to save categories')
  return res.json()
}
