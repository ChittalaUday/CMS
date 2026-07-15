export function since(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(0, 0, 0, 0)
  return d
}

export function bucketByDate<T extends { createdAt: Date }>(
  rows: T[],
  days: number
): Map<string, T[]> {
  const map = new Map<string, T[]>()
  const start = since(days)
  for (let i = 0; i < days; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    map.set(d.toISOString().slice(0, 10), [])
  }
  for (const row of rows) {
    const key = row.createdAt.toISOString().slice(0, 10)
    if (map.has(key)) map.get(key)!.push(row)
  }
  return map
}
