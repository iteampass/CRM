import { useI18n } from "@/lib/i18n";
import { useEffect, useState, type FormEvent } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { createTaskRequest, getRepairCategories } from '@/lib/handyflow.functions'

const inputCls =
  'mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function RequestDialog({ defaultLocation, onClose }: { defaultLocation: string; onClose: () => void }) {
  const { t: tr, locale } = useI18n();
  const queryClient = useQueryClient()
  const fetchCategories = useServerFn(getRepairCategories)
  const create = useServerFn(createTaskRequest)

  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState(defaultLocation)
  const [date, setDate] = useState('')
  const [budget, setBudget] = useState('')
  const [budgetMax, setBudgetMax] = useState('')
  const [priority, setPriority] = useState('Medium')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchCategories()
      .then((rows) => {
        if (cancelled) return
        setCategories(rows)
        if (rows.length && !categoryId) setCategoryId(rows[0]!.id)
      })
      .catch(() => toast.error(tr('Could not load categories')))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const payload = {
        title,
        categoryId,
        description,
        location,
        preferredDate: date,
        budget: Number(budget),
        priority,
      }
      await create({ data: budgetMax ? { ...payload, budgetMax: Number(budgetMax) } : payload })
      await queryClient.invalidateQueries({ queryKey: ['workspace'] })
      toast.success(tr('Request created'))
      onClose()
    } catch (err) {
      toast.error(tr(err instanceof Error ? err.message : 'Could not create the request'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-background p-6 text-foreground shadow-xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">{tr("New request")}</h2>
            <p className="text-sm text-muted-foreground">{tr("Describe the job and a handyman will pick it up.")}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={tr("Close")} className="rounded-md p-1 hover:bg-accent">
            <X className="size-4" />
          </button>
        </div>

        <label className="mt-5 block text-sm font-medium">{tr("Title")}</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder={tr("e.g. Fix leaking kitchen sink")}
          className={inputCls}
        />

        <label className="mt-4 block text-sm font-medium">{tr("Category")}</label>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required className={inputCls}>
          {categories.length === 0 && <option value="">{tr("Loading…")}</option>}
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {tr(c.name)}
            </option>
          ))}
        </select>

        <label className="mt-4 block text-sm font-medium">{tr("Description")}</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder={tr("What needs to be done?")}
          className={inputCls}
        />

        <label className="mt-4 block text-sm font-medium">{tr("Location")}</label>
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          required
          placeholder={tr("Street, number, city")}
          className={inputCls}
        />

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium">{tr("Preferred date")}</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium">{tr("Priority")}</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className={inputCls}>
              {['Low', 'Medium', 'High', 'Urgent'].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium">{tr("Budget from ($)")}</label>
            <input
              type="number"
              min="0"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              required
              placeholder="100"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">{tr("Budget to ($)")}</label>
            <input
              type="number"
              min="0"
              value={budgetMax}
              onChange={(e) => setBudgetMax(e.target.value)}
              placeholder={tr("250 (optional)")}
              className={inputCls}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-input px-4 py-2 text-sm hover:bg-accent">{tr("Cancel")}</button>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {busy && <Loader2 className="size-4 animate-spin" />}{" "}{tr("Create request")}</button>
        </div>
      </form>
    </div>
  )
}
