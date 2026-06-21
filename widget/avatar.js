// Deterministic, network-free avatars seeded from the commenter's name.
// Same name → same initials + colour, every render.

export function initials(name) {
  const parts = (name || '?').trim().split(/\s+/)
  const first = parts[0]?.[0] || ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return ((first + last).toUpperCase()) || '?'
}

export function avatarColor(name) {
  let h = 0
  const s = name || '?'
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360
  // fixed S/L keeps every colour legible against white text in both themes
  return `hsl(${h}, 52%, 48%)`
}
