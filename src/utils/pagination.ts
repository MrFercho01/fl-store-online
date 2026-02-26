export type PaginationItem = number | 'ellipsis'

export const buildCompactPagination = (
  currentPage: number,
  totalPages: number,
  maxVisible: number
): PaginationItem[] => {
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const pageSet = new Set<number>([1, totalPages, currentPage, currentPage - 1, currentPage + 1])

  if (currentPage <= 3) {
    pageSet.add(2)
    pageSet.add(3)
    pageSet.add(4)
  }

  if (currentPage >= totalPages - 2) {
    pageSet.add(totalPages - 1)
    pageSet.add(totalPages - 2)
    pageSet.add(totalPages - 3)
  }

  const sortedPages = Array.from(pageSet)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((first, second) => first - second)

  const compactItems: PaginationItem[] = []
  sortedPages.forEach((page, index) => {
    const previous = sortedPages[index - 1]
    if (previous && page - previous > 1) {
      compactItems.push('ellipsis')
    }
    compactItems.push(page)
  })

  return compactItems
}
