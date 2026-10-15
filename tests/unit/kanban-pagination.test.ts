import assert from "node:assert/strict"

// Test column pagination calculations
function getColumnPaginationInfo(totalCount: number, page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const clampedPage = Math.min(Math.max(1, page), totalPages)
  const startItem = totalCount === 0 ? 0 : (clampedPage - 1) * pageSize + 1
  const endItem = Math.min(clampedPage * pageSize, totalCount)

  return {
    totalPages,
    clampedPage,
    startItem,
    endItem,
    hasPrev: clampedPage > 1,
    hasNext: clampedPage < totalPages,
  }
}

function runKanbanPaginationTests() {
  console.log("Testing Kanban Column Pagination Calculations...")

  // Case 1: Empty column
  const empty = getColumnPaginationInfo(0, 1, 5)
  assert.equal(empty.totalPages, 1)
  assert.equal(empty.clampedPage, 1)
  assert.equal(empty.startItem, 0)
  assert.equal(empty.endItem, 0)
  assert.equal(empty.hasPrev, false)
  assert.equal(empty.hasNext, false)
  console.log("✓ Empty column handled correctly")

  // Case 2: Column with 3 candidates (less than pageSize 5)
  const few = getColumnPaginationInfo(3, 1, 5)
  assert.equal(few.totalPages, 1)
  assert.equal(few.startItem, 1)
  assert.equal(few.endItem, 3)
  assert.equal(few.hasPrev, false)
  assert.equal(few.hasNext, false)
  console.log("✓ Single page column with 3 candidates handled correctly")

  // Case 3: Column with 12 candidates on page 1 of 3
  const p1 = getColumnPaginationInfo(12, 1, 5)
  assert.equal(p1.totalPages, 3)
  assert.equal(p1.startItem, 1)
  assert.equal(p1.endItem, 5)
  assert.equal(p1.hasPrev, false)
  assert.equal(p1.hasNext, true)
  console.log("✓ Page 1 of multi-page column handled correctly")

  // Case 4: Column with 12 candidates on page 2 of 3
  const p2 = getColumnPaginationInfo(12, 2, 5)
  assert.equal(p2.totalPages, 3)
  assert.equal(p2.startItem, 6)
  assert.equal(p2.endItem, 10)
  assert.equal(p2.hasPrev, true)
  assert.equal(p2.hasNext, true)
  console.log("✓ Page 2 of multi-page column handled correctly")

  // Case 5: Column with 12 candidates on page 3 of 3
  const p3 = getColumnPaginationInfo(12, 3, 5)
  assert.equal(p3.totalPages, 3)
  assert.equal(p3.startItem, 11)
  assert.equal(p3.endItem, 12)
  assert.equal(p3.hasPrev, true)
  assert.equal(p3.hasNext, false)
  console.log("✓ Last page of multi-page column handled correctly")

  console.log("All Kanban column pagination tests passed successfully! 🎉")
}

runKanbanPaginationTests()
