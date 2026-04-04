import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { getFavorites, toggleFavorite as apiToggleFavorite } from './api'

const FavoritesContext = createContext(null)

const LOCAL_KEY = 'kgs_favorites'

function loadLocalFavorites() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

export function FavoritesProvider({ children }) {
  const { user } = useAuth()
  const [favorites, setFavorites] = useState(loadLocalFavorites)
  const [synced, setSynced] = useState(false)

  // Persist to localStorage whenever favorites change
  useEffect(() => {
    localStorage.setItem(LOCAL_KEY, JSON.stringify([...favorites]))
  }, [favorites])

  // When user logs in, fetch server favorites and merge
  useEffect(() => {
    if (user && !synced) {
      getFavorites()
        .then(products => {
          const serverIds = new Set(products.map(p => p.id))
          setFavorites(prev => new Set([...prev, ...serverIds]))
          setSynced(true)
        })
        .catch(() => setSynced(true))
    }
    if (!user) {
      setSynced(false)
    }
  }, [user, synced])

  const toggleFavorite = useCallback(async (product) => {
    const id = product.id
    const isCurrentlyFav = favorites.has(id)

    // Optimistic update
    setFavorites(prev => {
      const next = new Set(prev)
      if (isCurrentlyFav) next.delete(id)
      else next.add(id)
      return next
    })

    // Sync to server if logged in
    if (user) {
      try {
        await apiToggleFavorite(id)
      } catch {
        // Rollback on failure
        setFavorites(prev => {
          const next = new Set(prev)
          if (isCurrentlyFav) next.add(id)
          else next.delete(id)
          return next
        })
      }
    }
  }, [favorites, user])

  const isFavorite = useCallback((id) => favorites.has(id), [favorites])

  return (
    <FavoritesContext.Provider value={{ favorites, toggleFavorite, isFavorite, favCount: favorites.size }}>
      {children}
    </FavoritesContext.Provider>
  )
}

export const useFavorites = () => {
  const ctx = useContext(FavoritesContext)
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider')
  return ctx
}
