import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { COUNTRIES } from '@/lib/countries'

export function FlagImg({ code, className = '' }: { code: string; className?: string }) {
  if (!code) return null
  return (
    <img
      src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
      srcSet={`https://flagcdn.com/w80/${code.toLowerCase()}.png 2x`}
      alt=""
      loading="lazy"
      className={`h-3.5 w-5 shrink-0 rounded-[2px] object-cover ${className}`}
    />
  )
}

interface Props {
  value: string
  onChange: (code: string) => void
  placeholder?: string
  className?: string
}

export function CountrySelect({ value, onChange, placeholder = 'Select country', className = '' }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const selected = COUNTRIES.find((c) => c.code === value)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const list = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(query.toLowerCase()) || c.dial.includes(query),
  )

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        aria-label="Country"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2.5 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {selected ? (
          <>
            <FlagImg code={selected.code} />
            <span className="truncate">{selected.name}</span>
            <span className="text-muted-foreground">({selected.dial})</span>
          </>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        <ChevronDown className="ml-auto size-4 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 max-h-72 w-full overflow-hidden rounded-md border border-input bg-popover shadow-lg">
          <div className="flex items-center gap-2 border-b border-input px-3 py-2">
            <Search className="size-4 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search country"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
          <ul className="max-h-60 overflow-y-auto py-1">
            {list.map((c) => (
              <li key={c.code}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(c.code)
                    setOpen(false)
                    setQuery('')
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent ${
                    c.code === value ? 'bg-accent' : ''
                  }`}
                >
                  <FlagImg code={c.code} />
                  <span className="truncate">{c.name}</span>
                  <span className="ml-auto text-muted-foreground">{c.dial}</span>
                </button>
              </li>
            ))}
            {list.length === 0 && (
              <li className="px-3 py-2 text-sm text-muted-foreground">No matches</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
