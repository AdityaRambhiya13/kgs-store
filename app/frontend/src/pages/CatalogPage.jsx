import { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import HeroBanner from '../components/HeroBanner'
import RecommendationsSection from '../components/RecommendationsSection'
import { useCart } from '../CartContext'
import { useAuth } from '../AuthContext'
import { getProducts, getReorderReminders, getCategories } from '../api'
import ProductDetailsModal from '../components/ProductDetailsModal'
import { getMRP } from '../utils/pricing'

// ── Zepto category definitions ──────────────────────────────────
const VIRTUAL_CATEGORIES = [
  { name: 'Newly Launched',             emoji: '⭐', color: '#fbbf24' },
  { name: 'Parachute New',              emoji: '✨', color: '#3b82f6', displayName: 'Parachute New Arrivals' },
  { name: 'Dehaat Products',            emoji: '🌾', color: '#10b981', displayName: 'Dehaat Farm Fresh Products' },
  { name: 'Organic India',              emoji: '🌿', color: '#10b981', displayName: 'Organic India Products' },
]

const DEFAULT_STANDARD_CATEGORIES = [
  { name: 'Atta, Rice & Dal',           emoji: '🌾', color: '#f59e0b' },
  { name: 'Masala & Dry Fruits',        emoji: '🌶️', color: '#ef4444' },
  { name: 'Snacks & Munchies',          emoji: '🍿', color: '#8b5cf6' },
  { name: 'Sweet Tooth',                emoji: '🍭', color: '#ec4899' },
  { name: 'Cleaning Essentials',        emoji: '🧼', color: '#06b6d4' },
  { name: 'Instant & Frozen Food',      emoji: '🍜', color: '#f97316' },
  { name: 'Dairy & Bread',              emoji: '🥛', color: '#3b82f6' },
  { name: 'Personal Care',              emoji: '💄', color: '#d946ef' },
  { name: 'Cold Drinks & Juices',       emoji: '🥤', color: '#22c55e' },
  { name: 'Wellness',                   emoji: '💊', color: '#14b8a6' },
  { name: 'Tea, Coffee & Health Drinks',emoji: '☕', color: '#92400e' },
  { name: 'Home & Lifestyle',           emoji: '🏠', color: '#0ea5e9' },
  { name: 'Pooja Needs',                emoji: '🪔', color: '#eab308' },
  { name: 'Miscellaneous',              emoji: '📦', color: '#64748b' },
]

// ── Blocked categories ───────────────────────────────────────────
const BLOCKED_CATEGORIES = new Set([
  'Pet Supplies', 'Books & Media', 'Stationery', 'Packaging & Carry Bags'
])

// ── HTML Entity Unescaping Helper ───────────────────────────
const unescapeHTML = (str) => {
  if (!str) return ''
  const txt = document.createElement('textarea')
  txt.innerHTML = str
  let val = txt.value
  while (val.includes('&') && val !== str) {
    str = val
    txt.innerHTML = str
    val = txt.value
  }
  return val.trim()
}

// ── Levenshtein Distance for Typo Tolerance ────────────────────
const levenshteinDistance = (a, b) => {
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length
  const matrix = []
  for (let i = 0; i <= b.length; i++) matrix[i] = [i]
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        )
      }
    }
  }
  return matrix[b.length][a.length]
}

// ── Hindi-English Grocery Phrase and Word Synonyms ──────────────
const PHRASE_SYNONYMS = [
  { phrases: ["cottage cheese", "paneer"] },
  { phrases: ["clarified butter", "ghee", "cow ghee"] },
  { phrases: ["instant noodles", "maggi", "noodles"] },
  { phrases: ["wheat flour", "atta", "aata", "ashirvaad atta"] },
  { phrases: ["hair wash", "shampoo"] },
  { phrases: ["body wash", "handwash", "soap", "sabun"] },
  { phrases: ["curd", "dahi", "yogurt"] },
  { phrases: ["milk", "doodh", "dudh"] },
  { phrases: ["sugar", "cheeni", "chini", "shakkar"] },
  { phrases: ["potato", "potatoes", "aloo", "alu"] },
  { phrases: ["onion", "onions", "pyaz", "pyaaz"] },
  { phrases: ["lemon", "lime", "nimbu"] },
  { phrases: ["biscuit", "biscuits", "biskit", "biscut", "cookies"] },
  { phrases: ["tea", "chai", "chaya"] },
  { phrases: ["oil", "tel"] },
  { phrases: ["chilli", "chili", "mirchi", "mirch"] },
  { phrases: ["bread", "pav", "bun"] },
  { phrases: ["ketchup", "sauce"] }
]

const SYNONYMS = {
  "ghee": ["clarified butter", "cow ghee"],
  "atta": ["flour", "gehun", "wheat flour", "aata"],
  "aata": ["flour", "gehun", "wheat flour", "atta"],
  "dahi": ["curd", "yogurt"],
  "curd": ["dahi", "yogurt"],
  "yogurt": ["dahi", "curd"],
  "milk": ["doodh", "dudh"],
  "doodh": ["milk", "dudh"],
  "dudh": ["milk", "doodh"],
  "soap": ["sabun", "bar", "body wash", "handwash"],
  "sabun": ["soap", "bar", "body wash"],
  "salt": ["namak"],
  "namak": ["salt"],
  "sugar": ["cheeni", "chini", "shakkar"],
  "cheeni": ["sugar", "chini", "shakkar"],
  "chini": ["sugar", "cheeni", "shakkar"],
  "shakkar": ["sugar", "cheeni", "chini"],
  "rice": ["chawal", "basmati", "kolam"],
  "chawal": ["rice", "basmati"],
  "banana": ["kela"],
  "kela": ["banana"],
  "potato": ["potatoes", "aloo", "alu"],
  "potatoes": ["potato", "aloo", "alu"],
  "aloo": ["potato", "potatoes", "alu"],
  "alu": ["potato", "potatoes", "aloo"],
  "onion": ["onions", "pyaz", "pyaaz"],
  "onions": ["onion", "pyaz", "pyaaz"],
  "pyaz": ["onion", "onions", "pyaaz"],
  "pyaaz": ["onion", "onions", "pyaz"],
  "ginger": ["adrak"],
  "adrak": ["ginger"],
  "coriander": ["dhaniya", "kothimbir"],
  "dhaniya": ["coriander", "kothimbir"],
  "lemon": ["lime", "nimbu"],
  "lime": ["lemon", "nimbu"],
  "nimbu": ["lemon", "lime"],
  "paneer": ["cottage cheese"],
  "biscuit": ["biscuits", "biskit", "biscut", "cookies"],
  "biscuits": ["biscuit", "biskit", "biscut", "cookies"],
  "biskit": ["biscuit", "biscuits", "cookies"],
  "biscut": ["biscuit", "biscuits", "cookies"],
  "cookies": ["biscuit", "biscuits"],
  "noodle": ["noodles", "maggi", "maggy"],
  "noodles": ["noodle", "maggi", "maggy"],
  "maggi": ["noodles", "maggy"],
  "maggy": ["noodles", "maggi"],
  "tea": ["chai", "chaya"],
  "chai": ["tea", "chaya"],
  "oil": ["tel"],
  "tel": ["oil"],
  "poha": ["flattened rice"],
  "rava": ["sooji", "suji", "semolina"],
  "sooji": ["rava", "suji", "semolina"],
  "suji": ["rava", "sooji", "semolina"],
  "semolina": ["rava", "sooji", "suji"],
  "maida": ["all purpose flour"],
  "besan": ["gram flour"],
  "spice": ["masala"],
  "masala": ["spice"],
  "shampoo": ["hair wash"],
  "toothpaste": ["colgate", "pepsodent", "sensodyne"],
  "colgate": ["toothpaste"],
  "chilli": ["chili", "mirchi", "mirch"],
  "chili": ["chilli", "mirchi", "mirch"],
  "mirchi": ["chilli", "chili", "mirch"],
  "mirch": ["chilli", "chili", "mirchi"],
  "bread": ["loaf", "bun", "pav"],
  "pav": ["bread"],
  "butter": ["makkhan"],
  "makkhan": ["butter"],
  "cheese": ["spread", "slices", "block"],
  "ketchup": ["sauce"],
  "sauce": ["ketchup"],
  "coffee": ["nescafe", "bru"],
  "water": ["bisleri", "aquafina", "mineral water"]
}

// ── Relevance Scoring Search Engine ─────────────────────────────
const scoreSearch = (query, product) => {
  if (!query) return { match: true, score: 0 }
  
  const q = String(query).toLowerCase().trim()
  const name = String(product.name || '').toLowerCase().trim()
  const baseName = String(product.base_name || '').toLowerCase().trim()
  const category = String(product.category || '').toLowerCase().trim()
  const subCategory = String(product.sub_category || '').toLowerCase().trim()

  // 1. Exact string matches (Highest priority)
  if (name === q) return { match: true, score: 2000 }
  if (baseName === q) return { match: true, score: 1800 }

  const queryWords = q.split(/\s+/).filter(Boolean)
  const nameWords = name.split(/\s+/).filter(Boolean)
  const baseWords = baseName.split(/\s+/).filter(Boolean)
  const targetWords = [...new Set([...nameWords, ...baseWords])]

  if (queryWords.length === 0) return { match: false, score: 0 }

  let totalScore = 0
  let matchedQueryWordsCount = 0
  const matchedIndices = new Set()

  // Check phrase-level synonyms first
  let phraseSynonymScore = 0
  
  for (const group of PHRASE_SYNONYMS) {
    const matchingQueryPhrase = group.phrases.find(phrase => q.includes(phrase))
    if (matchingQueryPhrase) {
      const matchingProductPhrase = group.phrases.find(phrase => name.includes(phrase) || baseName.includes(phrase))
      if (matchingProductPhrase) {
        phraseSynonymScore += 300
        
        // Mark the words of the matching query phrase as matched
        const phraseWords = matchingQueryPhrase.split(/\s+/)
        phraseWords.forEach(w => {
          const idx = queryWords.indexOf(w)
          if (idx !== -1) matchedIndices.add(idx)
        })
      }
    }
  }

  totalScore += phraseSynonymScore

  // Match each query word
  for (let i = 0; i < queryWords.length; i++) {
    if (matchedIndices.has(i)) {
      matchedQueryWordsCount++
      continue
    }

    const qw = queryWords[i]
    let bestWordScore = 0
    const synonyms = SYNONYMS[qw] || []

    // Category / SubCategory matches
    if (category.includes(qw) || subCategory.includes(qw)) {
      bestWordScore = Math.max(bestWordScore, 100)
    }

    for (const tw of targetWords) {
      // a. Exact word match
      if (tw === qw) {
        bestWordScore = Math.max(bestWordScore, 500)
        continue
      }

      // b. Prefix match: word starts with query
      if (tw.startsWith(qw)) {
        bestWordScore = Math.max(bestWordScore, 400)
        continue
      }

      // c. Substring match
      if (tw.includes(qw)) {
        bestWordScore = Math.max(bestWordScore, 150)
        continue
      }

      // d. Synonym word match
      for (const syn of synonyms) {
        if (tw === syn) {
          bestWordScore = Math.max(bestWordScore, 300)
        } else if (tw.startsWith(syn)) {
          bestWordScore = Math.max(bestWordScore, 250)
        }
      }

      // e. Typo tolerance / Fuzzy match (Levenshtein distance)
      if (qw.length >= 4 && tw.length >= 4) {
        const dist = levenshteinDistance(qw, tw)
        const maxAllowedDist = qw.length <= 5 ? 1 : 2
        if (dist <= maxAllowedDist) {
          const fuzzyScore = 200 - dist * 50
          bestWordScore = Math.max(bestWordScore, fuzzyScore)
        }
      }
    }

    if (bestWordScore > 0) {
      totalScore += bestWordScore
      matchedQueryWordsCount++
    }
  }

  // All query words must find a match in the product to qualify (strict match)
  if (matchedQueryWordsCount < queryWords.length) {
    return { match: false, score: 0 }
  }

  // Add a bonus if the query matches the start of the product name
  if (name.startsWith(q)) {
    totalScore += 200
  } else if (baseName.startsWith(q)) {
    totalScore += 150
  }

  // Add a bonus if the query is a complete substring of the name
  if (name.includes(q)) {
    totalScore += 100
  }

  return { match: true, score: totalScore }
}

// ── Product Category & Subcategory Standardization Helper ───────
const standardizeProduct = (p) => {
  if (!p) return null
  const originalCat = unescapeHTML(p.category)
  let cat = originalCat || 'Other'
  let sub = unescapeHTML(p.sub_category) || ''

  const name = (p.name || p.base_name || '').toLowerCase()

  // 1. Move Cooking Oils and Ghee to "Oil & Ghee" if they are in cooking/grocery categories
  if (originalCat === 'Atta, Rice & Dal' || originalCat === 'Tea, Coffee & Health Drinks' || originalCat === 'Oil & Ghee') {
    if (/\bghee\b/.test(name) && !name.includes('soanpapdi') && !name.includes('soan papdi')) {
      cat = 'Oil & Ghee'
      sub = 'Ghee'
    } else if (sub === 'Ghee') {
      cat = 'Oil & Ghee'
    } else if (
      /\b(oil|tel|mustard|sunflower|groundnut|olive|vanaspati|dalda)\b/.test(name)
    ) {
      cat = 'Oil & Ghee'
      if (name.includes('dalda') || name.includes('vanaspati')) {
        sub = 'Ghee'
      } else {
        sub = 'Cooking Oils'
      }
    } else if (sub === 'Cooking Oils') {
      cat = 'Oil & Ghee'
    }
  }

  // 2. Clean up subcategories under "Oil & Ghee"
  if (cat === 'Oil & Ghee') {
    if (sub !== 'Ghee' && sub !== 'Cooking Oils') {
      if (name.includes('ghee') || name.includes('dalda') || name.includes('vanaspati')) {
        sub = 'Ghee'
      } else {
        sub = 'Cooking Oils'
      }
    }
  }

  // 3. Other category mappings
  if (cat === 'Dairy, Bread & Eggs') cat = 'Dairy & Bread'
  if (cat === 'Pharma & Wellness' || cat === '& Wellness') cat = 'Wellness'

  return {
    ...p,
    category: cat,
    sub_category: sub
  }
}

export default function CatalogPage({ searchQuery = '', onSearchFocus, navCategory }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [activeSubCategory, setActiveSubCategory] = useState('All')
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [selectedProductDetails, setSelectedProductDetails] = useState(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const categoryParam = searchParams.get('category') || 'All'

  const { cartCount } = useCart()
  const { user } = useAuth()
  const [productLimit, setProductLimit] = useState(40)
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const [officialCategories, setOfficialCategories] = useState([...VIRTUAL_CATEGORIES, ...DEFAULT_STANDARD_CATEGORIES])

  const categoryMap = useMemo(() => {
    return Object.fromEntries(officialCategories.map(c => [c.name, c]))
  }, [officialCategories])

  useEffect(() => {
    let active = true
    getCategories()
      .then(data => {
        if (active && Array.isArray(data) && data.length > 0) {
          setOfficialCategories([...VIRTUAL_CATEGORIES, ...data])
        }
      })
      .catch(err => console.error("Error fetching categories in CatalogPage:", err))
    return () => { active = false }
  }, [])

  const [reorderItems, setReorderItems] = useState([])
  const [reorderLoading, setReorderLoading] = useState(false)

  useEffect(() => {
    if (!user) {
      setReorderItems([])
      return
    }
    setReorderLoading(true)
    getReorderReminders()
      .then(data => {
        setReorderItems(Array.isArray(data) ? data : [])
        setReorderLoading(false)
      })
      .catch(err => {
        console.error('Failed to load reorder essentials:', err)
        setReorderLoading(false)
      })
  }, [user])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setProductLimit(40) // Reset limit on search
    }, 200) // Faster response
    return () => clearTimeout(timer)
  }, [searchQuery])

  const abortRef = useRef(null)
  const prevCartCount = useRef(cartCount)
  const location = useLocation()
  const navigate = useNavigate()
  const [toastMessage, setToastMessage] = useState('')
  const categoryBarRef = useRef(null)
  const catalogMainRef = useRef(null)

  // Sync state with URL param
  useEffect(() => {
    setActiveCategory(categoryParam)
    setActiveSubCategory('All')
    setProductLimit(40)
  }, [categoryParam])

  // React to navCategory from Navbar dropdown
  useEffect(() => {
    if (navCategory) {
      handleCategorySelect(navCategory)
    }
  }, [navCategory])

  useEffect(() => {
    if (location.state?.cancelMessage) {
      setToastMessage(location.state.cancelMessage)
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.state?.cancelMessage, navigate, location.pathname])

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(''), 10000)
      return () => clearTimeout(timer)
    }
  }, [toastMessage])

  useEffect(() => {
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    getProducts(controller.signal)
      .then(data => {
        if (!controller.signal.aborted) {
          const allProducts = Array.isArray(data) ? data : []
          setProducts(allProducts)
          setLoading(false)
        }
      })
      .catch(err => {
        if (!controller.signal.aborted) {
          setError(err.message || 'Could not load products')
          setLoading(false)
        }
      })
    return () => controller.abort()
  }, [])

  // All unique top-level categories that have products
  const availableCategories = useMemo(() => {
    const set = new Set()
    let hasParachute = false
    let hasDehaat = false
    let hasOrganic = false

    products.forEach(p => {
      const std = standardizeProduct(p)
      if (!std) return
      const cat = std.category
      if (!BLOCKED_CATEGORIES.has(cat)) set.add(cat)
      if (std.is_newly_launched) set.add('Newly Launched')

      const name = std.name || std.base_name || ''
      if (std.is_newly_launched && /parachute/i.test(name)) hasParachute = true
      if (/dehaat|deehat/i.test(name)) hasDehaat = true
      if (/organic\s*india/i.test(name)) hasOrganic = true
    })

    if (hasParachute) set.add('Parachute New')
    if (hasDehaat) set.add('Dehaat Products')
    if (hasOrganic) set.add('Organic India')
    
    // Robust matching: handle potential name changes (e.g. Dairy, Bread & Eggs -> Dairy & Bread)
    return officialCategories.filter(c => {
      if (set.has(c.name)) return true
      // Fallbacks for common renames
      if (c.name === 'Dairy & Bread' && set.has('Dairy, Bread & Eggs')) return true
      if (c.name === 'Wellness' && set.has('Pharma & Wellness')) return true
      if (c.name === 'Wellness' && set.has('& Wellness')) return true
      return false
    })
  }, [products, officialCategories])

  // Sub-categories for the active category
  const subCategories = useMemo(() => {
    if (activeCategory === 'All') return []
    const subs = new Set()
    products.forEach(p => {
      const std = standardizeProduct(p)
      if (!std) return
      const cat = std.category
      if (cat === activeCategory && std.sub_category) {
        subs.add(std.sub_category)
      }
    })
    return ['All', ...Array.from(subs).sort()]
  }, [products, activeCategory])

  // Grouped products (base_name collapsing)
  const grouped = useMemo(() => {
    const groups = {}
    
    // 1. Group all variants by their standardized base key to collect all options
    const allVariantsMap = {}
    products.forEach(p => {
      const std = standardizeProduct(p)
      if (!std) return
      const cat = std.category
      if (BLOCKED_CATEGORIES.has(cat)) return
      
      const baseKey = (std.base_name || std.name) + '|' + cat
      if (!allVariantsMap[baseKey]) {
        allVariantsMap[baseKey] = []
      }
      allVariantsMap[baseKey].push(std)
    })

    // Sort variants in each group by price
    Object.keys(allVariantsMap).forEach(key => {
      allVariantsMap[key].sort((a, b) => a.price - b.price)
    })

    // 2. Build the final displayed catalog items
    products.forEach(p => {
      const std = standardizeProduct(p)
      if (!std) return
      const cat = std.category
      if (BLOCKED_CATEGORIES.has(cat)) return
      
      const baseKey = (std.base_name || std.name) + '|' + cat

      // If a product is explicitly ranked/sorted (display_order > 0), display it as a separate card.
      // Otherwise, group by its baseKey.
      const isPinned = std.display_order > 0
      const key = isPinned ? `${std.id}|${cat}` : baseKey

      if (!groups[key]) {
        const cheapestVariant = isPinned ? std : (allVariantsMap[baseKey][0] || std)
        groups[key] = { 
          ...cheapestVariant, 
          category: cat, 
          sub_category: std.sub_category, 
          variants: allVariantsMap[baseKey] 
        }
      } else if (std.is_newly_launched) {
        groups[key].is_newly_launched = true;
      }
    })
    
    // Ensure all variants in a group share the group's main image,
    // EXCEPT if a variant has its own custom image (which retains it).
    return Object.values(groups).map(group => {
      const mainImage = group.image_url
      group.variants = group.variants.map(v => ({
        ...v,
        image_url: v.image_url || mainImage
      }))
      return group
    })
  }, [products])


  // Filtered products by search / category / sub-category
  const filtered = useMemo(() => {
    if (!products || !Array.isArray(products)) return []

    // Search mode: show all individual matching products but keep variant groups for modal
    if (debouncedSearch && typeof debouncedSearch === 'string' && debouncedSearch.trim()) {
      const lq = debouncedSearch.toLowerCase().trim()
      
      // Map for easy group lookup to get variants
      const groupMap = {}
      if (Array.isArray(grouped)) {
        grouped.forEach(g => {
          if (!g) return
          const key = (g.base_name || g.name || 'unknown') + '|' + (g.category || 'Other')
          groupMap[key] = g
        })
      }

      return products
        .map(p => {
          const std = standardizeProduct(p)
          if (!std) return null
          const unescapedCat = std.category
          if (BLOCKED_CATEGORIES.has(unescapedCat)) return null
          
          const { match, score } = scoreSearch(lq, std)
          if (!match) return null

          let cat = unescapedCat
          const key = (std.base_name || std.name || 'unknown') + '|' + cat
          const group = groupMap[key]
          // Title Standardization with cleaning
          let base = std.base_name || std.name
          let unit = std.unit || ''
          
          // Clean redundant unit mentions (e.g. "Gulab Oil 1L" + "1L" -> "Gulab Oil 1L")
          if (unit && base.toLowerCase().endsWith(unit.toLowerCase().trim())) {
            unit = ''
          }
          // Handle common overlaps like "1Lit" vs "1L"
          if (unit && unit.toLowerCase() === '1l' && base.toLowerCase().endsWith('1lit')) {
            unit = ''
          }

          return {
            ...std,
            displayName: unit ? `${base} ${unit}` : base,
            displayPrice: std.price || 0,
            category: cat,
            sub_category: std.sub_category,
            searchScore: score,
            variants: (group && group.variants) ? group.variants : [{ ...std, category: cat, sub_category: std.sub_category }]
          }
        })
        .filter(Boolean)
        .sort((a, b) => {
          if (b.searchScore !== a.searchScore) {
            return b.searchScore - a.searchScore
          }
          const aName = String(a.name || a.displayName || '').toLowerCase()
          const bName = String(b.name || b.displayName || '').toLowerCase()
          const aStarts = aName.startsWith(lq)
          const bStarts = bName.startsWith(lq)
          if (aStarts && !bStarts) return -1
          if (!aStarts && bStarts) return 1
          return aName.localeCompare(bName)
        })
    }

    let result = Array.isArray(grouped) ? [...grouped] : []

    // Category filter
    if (activeCategory !== 'All') {
      if (activeCategory === 'Newly Launched') {
        result = result.filter(g => g && g.is_newly_launched === true)
      } else if (activeCategory === 'Parachute New') {
        result = result.filter(g => g && g.is_newly_launched === true && /parachute/i.test(g.name || g.base_name))
      } else if (activeCategory === 'Dehaat Products') {
        result = result.filter(g => g && /dehaat|deehat/i.test(g.name || g.base_name))
      } else if (activeCategory === 'Organic India') {
        result = result.filter(g => g && /organic\s*india/i.test(g.name || g.base_name))
      } else {
        result = result.filter(g => g && g.category === activeCategory)
        // Sub-category filter
        if (activeSubCategory !== 'All') {
          result = result.filter(g => g && g.sub_category === activeSubCategory)
        }
      }
    }

    return result
  }, [grouped, products, activeCategory, activeSubCategory, debouncedSearch])

  // When "All" selected, group for section display
  const sectionedData = useMemo(() => {
    if (activeCategory !== 'All' || (debouncedSearch && debouncedSearch.trim())) return null
    const catMap = {}
    filtered.forEach(g => {
      const cat = g.category || 'Other'
      if (!catMap[cat]) catMap[cat] = []
      catMap[cat].push(g)
    })
    
    return availableCategories
      .filter(c => catMap[c.name] && catMap[c.name].length > 0)
      .map(c => ({ ...c, items: catMap[c.name] }))
  }, [filtered, activeCategory, searchQuery, availableCategories])


  const isSearchMode = !!(debouncedSearch && debouncedSearch.trim())

  // ── Dynamic Metadata ──────────────────────────────────
  useEffect(() => {
    let title = 'Ketan Stores — Fresh Groceries in Dombivali'
    let desc = 'Get fresh groceries, snacks, and essentials delivered fast in Dombivali from Ketan Stores.'
    
    if (isSearchMode) {
      title = `Search: ${debouncedSearch} | Ketan Stores`
    } else if (activeCategory !== 'All') {
      title = `${activeCategory} | Best Prices in Dombivali`
      desc = `Save big on ${activeCategory} at Ketan Stores. Quality products, fast delivery in Dombivali.`
    }

    document.title = title
    const metaDesc = document.querySelector('meta[name="description"]')
    if (metaDesc) metaDesc.setAttribute('content', desc)
  }, [activeCategory, debouncedSearch, isSearchMode])

  const handleCategorySelect = (catName) => {
    if (catName === 'All') {
      setSearchParams({})
    } else {
      setSearchParams({ category: catName })
    }
    
    // Scroll to top of content or main grid
    if (catName === 'All') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      setTimeout(() => {
        if (catalogMainRef.current) {
          const navOffset = 100 // Adjust based on navbar height
          const elementPosition = catalogMainRef.current.getBoundingClientRect().top
          const offsetPosition = elementPosition + window.pageYOffset - navOffset
          
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          })
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }
      }, 100)
    }
  }

  return (
    <div className="catalog-page">

      {/* Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'fixed', top: '80px', left: '50%',
              transform: 'translateX(-50%)', zIndex: 1000,
              background: toastMessage.includes('blocked') ? 'rgba(239,68,68,0.95)' : 'rgba(245,158,11,0.95)',
              color: 'white', padding: '12px 24px', borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)', fontSize: '14px',
              fontWeight: 600, textAlign: 'center', minWidth: '280px', maxWidth: '90%'
            }}
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Banner — only when not searching and on home page */}
      {!isSearchMode && activeCategory === 'All' && (
        <div className="hero-banner-container container">
          <HeroBanner />
        </div>
      )}

      {/* ── Reorder Essentials Section ── */}
      {!isSearchMode && activeCategory === 'All' && user && reorderItems.length > 0 && (
        <section className="reorder-section">
          <div className="reorder-header">
            <div className="reorder-title-group">
              <h2 className="reorder-title">⏰ Running Low? Reorder Essentials</h2>
              <p className="reorder-subtitle">Based on your past purchase cycles</p>
            </div>
            <span className="reorder-badge">Reorder Alert</span>
          </div>
          <div className="reorder-scroll-outer">
            <div className="reorder-scroll-track">
              {reorderItems.map(item => {
                const variants = item.variants && item.variants.length > 0 ? item.variants : [item]
                return (
                  <div key={item.id} className="smart-card-wrap">
                    <ProductCard
                      product={{
                        ...item,
                        variants: variants
                      }}
                      onDetailClick={(prod, mrpVal) => setSelectedProductDetails({ product: prod, mrp: mrpVal })}
                      onVariantClick={(prod, mrpVal) => setSelectedProductDetails({ product: prod, mrp: mrpVal })}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Recommendations / Trending Section ── */}
      {!isSearchMode && activeCategory === 'All' && <RecommendationsSection />}

      {/* ── Zepto Category Icon Grid ─────────────────────── */}
      {!isSearchMode && activeCategory === 'All' && (
        <section className="zepto-cat-grid-section">
          <div className="zepto-cat-grid">
            <div
              className={`zepto-cat-tile ${activeCategory === 'All' ? 'active' : ''}`}
              onClick={() => handleCategorySelect('All')}
            >
              <div className="zepto-cat-icon" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>✨</div>
              <span>All</span>
            </div>
            {availableCategories.map(cat => (
              <div
                key={cat.name}
                className={`zepto-cat-tile ${activeCategory === cat.name ? 'active' : ''}`}
                onClick={() => handleCategorySelect(cat.name)}
              >
                <div
                  className="zepto-cat-icon"
                  style={{ background: `linear-gradient(135deg, ${cat.color}cc, ${cat.color})` }}
                >
                  {cat.emoji}
                </div>
                <span>{cat.name}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Horizontal Category Pill Bar (sticky, shows when category selected) ── */}
      {!isSearchMode && activeCategory !== 'All' && (
        <div className="zepto-sticky-cat-bar" ref={categoryBarRef}>
          <div className="zepto-cat-pills-wrap">
            {availableCategories.map(cat => (
              <button
                key={cat.name}
                className={`zepto-cat-pill ${activeCategory === cat.name ? 'active' : ''}`}
                onClick={() => handleCategorySelect(cat.name)}
                style={activeCategory === cat.name ? { borderColor: cat.color, color: cat.color } : {}}
              >
                <span>{cat.emoji}</span> {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Sub-category filter bar ──────────────────────── */}
      {!isSearchMode && activeCategory !== 'All' && subCategories.length > 1 && (
        <div className="zepto-subcat-bar">
          <div className="zepto-subcat-pills">
            {subCategories.map(sub => (
              <button
                key={sub}
                className={`zepto-subcat-pill ${activeSubCategory === sub ? 'active' : ''}`}
                onClick={() => setActiveSubCategory(sub)}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Main Content ─────────────────────────────────── */}
      <div className="catalog-main-content" ref={catalogMainRef}>

        {/* Loading Skeletons */}
        {loading && (
          <div className="product-grid product-grid-multi" style={{ marginTop: 16, padding: '0 16px' }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton-card">
                <div className="skeleton skeleton-img" />
                <div className="skeleton-body">
                  <div className="skeleton skeleton-line medium" />
                  <div className="skeleton skeleton-line short" />
                  <div className="skeleton skeleton-line medium" style={{ marginTop: 12 }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && !loading && (
          <div className="empty-state">
            <div className="emoji">⚠️</div>
            <h3>Couldn't load products</h3>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="empty-state">
            <div className="emoji">🌾</div>
            <h3>No products found</h3>
            <p>{searchQuery ? 'Try a different search term.' : 'Try a different category.'}</p>
          </div>
        )}

        {/* Search Mode: flat grid */}
        {!loading && !error && isSearchMode && filtered.length > 0 && (
          <div style={{ padding: '0 16px', marginTop: '8px' }}>
            <p className="search-results-label">
              {filtered.length} result{filtered.length !== 1 ? 's' : ''} for &quot;{debouncedSearch}&quot;
              {searchQuery !== debouncedSearch && <span style={{ marginLeft: '8px', opacity: 0.5, fontSize: '0.8em' }}>(updating...)</span>}
            </p>
            <div className="product-grid product-grid-multi">
              {filtered.slice(0, productLimit).map(g => (
                <div key={g.id + (g.displayName || g.name)}>
                  <ProductCard
                    product={g}
                    onDetailClick={(prod, mrp) => setSelectedProductDetails({ product: prod, mrp })}
                    onVariantClick={(prod, mrp) => setSelectedProductDetails({ product: prod, mrp })}
                  />
                </div>
              ))}
            </div>
            {filtered.length > productLimit && (
              <div style={{ textAlign: 'center', marginTop: '24px', paddingBottom: '40px' }}>
                <button
                  className="btn btn-outline"
                  onClick={() => setProductLimit(prev => prev + 40)}
                  style={{ maxWidth: '300px', width: '100%' }}
                >
                  Load More Results ({filtered.length - productLimit} left)
                </button>
              </div>
            )}
          </div>
        )}

        {/* All-categories section view (not searching, showing All) */}
        {!loading && !error && !isSearchMode && activeCategory === 'All' && sectionedData && (
          <div className="product-sections" style={{ padding: '0 16px' }}>
            {sectionedData.map(section => {
              const preview = section.items.slice(0, 6)
              const hasMore = section.items.length > 6
              return (
                <div key={section.name} className="category-section">
                  <div className="section-header">
                    <h2 className="section-title" style={{ color: section.color }}>
                      {section.emoji} {section.name}
                    </h2>
                    {hasMore && (
                      <button
                        onClick={() => handleCategorySelect(section.name)}
                        className="see-all-btn"
                      >
                        See All →
                      </button>
                    )}
                  </div>
                  <div className="product-grid zepto-product-scroll">
                    {preview.map(item => (
                      <div key={(item.base_name || item.name) + item.category}>
                        <ProductCard
                          product={item}
                          onDetailClick={(prod, mrp) => setSelectedProductDetails({ product: prod, mrp })}
                          onVariantClick={(prod, mrp) => setSelectedProductDetails({ product: prod, mrp })}
                        />
                      </div>
                    ))}
                  </div>
                  {hasMore && (
                    <div style={{ textAlign: 'center', marginTop: '16px' }}>
                      <button
                        className="btn btn-outline"
                        onClick={() => handleCategorySelect(section.name)}
                        style={{ maxWidth: '300px', padding: '12px 24px', width: '100%', borderRadius: '12px' }}
                      >
                        View {section.items.length - preview.length} more in {section.name}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}



        {/* Single category selected — full grid */}
        {!loading && !error && !isSearchMode && activeCategory !== 'All' && filtered.length > 0 && (
          <div style={{ padding: '0 16px', marginTop: '8px' }}>
            <div className="section-header" style={{ marginBottom: '16px' }}>
              <h2 className="section-title" style={{ color: categoryMap[activeCategory]?.color }}>
                {categoryMap[activeCategory]?.emoji} {categoryMap[activeCategory]?.displayName || activeCategory}
                {activeSubCategory !== 'All' && <span style={{ fontSize: '0.8em', marginLeft: '8px', opacity: 0.7 }}>› {activeSubCategory}</span>}
              </h2>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{filtered.length} items</span>
            </div>
            <div className="product-grid product-grid-multi">
              {filtered.slice(0, productLimit).map(g => (
                <div key={(g.base_name || g.name) + g.category}>
                  <ProductCard
                    product={g}
                    onDetailClick={(prod, mrp) => setSelectedProductDetails({ product: prod, mrp })}
                    onVariantClick={(prod, mrp) => setSelectedProductDetails({ product: prod, mrp })}
                  />
                </div>
              ))}
            </div>
            {filtered.length > productLimit && (
              <div style={{ textAlign: 'center', marginTop: '16px', paddingBottom: '24px', gridColumn: '1 / -1' }}>
                <button
                  className="btn btn-outline"
                  onClick={() => setProductLimit(prev => prev + 40)}
                  style={{ maxWidth: '320px', width: '100%', borderRadius: '12px' }}
                >
                  Load More in {activeCategory} ({filtered.length - productLimit} left)
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Variant modal - Removed in favor of unified ProductDetailsModal */}
      {/* <ProductVariantModal
        group={selectedGroup}
        onClose={() => setSelectedGroup(null)}
      /> */}

      {/* Product Details Modal */}
      <AnimatePresence>
        {selectedProductDetails && (
          <ProductDetailsModal
            product={selectedProductDetails.product}
            mrp={selectedProductDetails.mrp}
            onClose={() => setSelectedProductDetails(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
