import { useEffect, useState } from 'react'

const getPaginationLimitByWidth = (width: number) => {
  return width < 640 ? 5 : 7
}

export const usePaginationLimit = () => {
  const [paginationLimit, setPaginationLimit] = useState(() =>
    getPaginationLimitByWidth(window.innerWidth)
  )

  useEffect(() => {
    const handleResize = () => {
      setPaginationLimit(getPaginationLimitByWidth(window.innerWidth))
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return paginationLimit
}
