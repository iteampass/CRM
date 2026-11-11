import { useI18n } from "@/lib/i18n";
import { useState, type FormEvent } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { updateMyProfile, type Viewer } from '@/lib/handyflow.functions'
import { COUNTRIES, dialFor } from '@/lib/countries'
import { CountrySelect } from '@/components/CountrySelect'
import { geocodeAddress } from '@/lib/geocode'

const inputClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function ProfileForm({
  viewer,
  onClose,
  embedded = false,
}: {
  viewer: Viewer
  onClose?: () => void
  embedded?: boolean
}) {
  const { t: tr, locale } = useI18n();
  const queryClient = useQueryClient()
  const save = useServerFn(updateMyProfile)
  const [firstName, setFirstName] = useState(viewer.firstName)
  const [lastName, setLastName] = useState(viewer.lastName)
  const [nickname, setNickname] = useState(viewer.nickname)
  const [street, setStreet] = useState(viewer.street)
  const [streetNumber, setStreetNumber] = useState(viewer.streetNumber)
  const [floor, setFloor] = useState(viewer.floor)
  const [zipCode, setZipCode] = useState(viewer.zipCode)
  const [city, setCity] = useState(viewer.city)
  const [countryCode, setCountryCode] = useState(viewer.countryCode)
  const [phones, setPhones] = useState<string[]>(viewer.phones.length ? viewer.phones : [''])
  const [headline, setHeadline] = useState(viewer.headline)
  const [bio, setBio] = useState(viewer.bio)
  const [location, setLocation] = useState(viewer.location)
  const [specialties, setSpecialties] = useState(viewer.specialties.join(', '))
  const [dailyRate, setDailyRate] = useState(viewer.dailyRate != null ? String(viewer.dailyRate) : '')
  const [available, setAvailable] = useState(viewer.available)
  const dial = dialFor(countryCode)

  function changeCountry(code: string) {
    const prev = dialFor(countryCode)
    const next = dialFor(code)
    setCountryCode(code)
    setPhones((list) =>
      list.map((p) => {
        const rest = prev && p.startsWith(prev) ? p.slice(prev.length).trim() : p.trim()
        return next ? `${next} ${rest}`.trim() : rest
      }),
    )
  }
  const [isPublic, setIsPublic] = useState(viewer.isPublic)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(viewer.avatarUrl)
  const [busy, setBusy] = useState(false)

  const isHandyman = viewer.role === 'handyman'

  function pickFile(f: File | null) {
    setFile(f)
    setPreview(f ? URL.createObjectURL(f) : viewer.avatarUrl)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      let avatarPath: string | null | undefined
      if (file) {
        const { data: auth } = await supabase.auth.getUser()
        const uid = auth.user?.id
        if (!uid) throw new Error('You are signed out')
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
        const path = `${uid}/avatar-${Date.now()}.${ext}`
        const { error } = await supabase.storage.from('handyflow-avatars').upload(path, file, { upsert: true })
        if (error) throw error
        avatarPath = path
      }
      const country = COUNTRIES.find((c) => c.code === countryCode)?.name ?? ''
      const geo = await geocodeAddress(
        [[street, streetNumber].filter(Boolean).join(' '), zipCode, city, country]
          .filter(Boolean)
          .join(', '),
      )
      const parsedRate = parseFloat(dailyRate)
      const fullName = [firstName, lastName].filter(Boolean).join(' ')
      await save({
        data: {
          firstName,
          lastName,
          name: fullName,
          nickname,
          street,
          streetNumber,
          floor,
          zipCode,
          city,
          country,
          countryCode,
          phones,
          isPublic,
          headline,
          bio,
          location,
          specialties: specialties.split(',').map((v) => v.trim()).filter(Boolean),
          dailyRate: Number.isFinite(parsedRate) && parsedRate >= 0 ? parsedRate : null,
          available,
          latitude: geo?.latitude ?? null,
          longitude: geo?.longitude ?? null,
          formattedAddress: geo?.formattedAddress ?? null,
          ...(avatarPath ? { avatarPath } : {}),
        },
      })
      await queryClient.invalidateQueries({ queryKey: ['workspace'] })
      toast.success(tr('Profile updated'))
      onClose?.()
    } catch (err) {
      toast.error(tr(err instanceof Error ? err.message : 'Could not save your profile'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={embedded ? '' : undefined}>
      <div className={embedded ? 'flex items-center gap-4' : 'mt-5 flex items-center gap-4'}>
        <div className="flex size-16 items-center justify-center overflow-hidden rounded-full bg-muted text-lg font-semibold">
          {preview ? (
            <img src={preview} alt={tr("Profile picture")} className="size-full object-cover" />
          ) : (
            viewer.initials
          )}
        </div>
        <label className="cursor-pointer rounded-md border border-input px-3 py-2 text-sm hover:bg-accent">{tr("Change picture")}<input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      <div className={embedded ? 'mt-6 grid gap-4 md:grid-cols-2' : 'contents'}>
        <div>
          <label className="mt-5 block text-sm font-medium md:mt-0">{tr("First name")}</label>
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required className={`mt-1 ${inputClass}`} />
        </div>
        <div>
          <label className="mt-5 block text-sm font-medium md:mt-0">{tr("Last name")}</label>
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} required className={`mt-1 ${inputClass}`} />
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium">{tr("Nickname")}</label>
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder={tr("Shown instead of your name in some places")}
          className={`mt-1 ${inputClass}`}
        />
      </div>

      <label className="mt-4 block text-sm font-medium">{tr("Home address")}</label>
      <div className="mt-1 grid grid-cols-12 gap-2">
        <input
          value={street}
          onChange={(e) => setStreet(e.target.value)}
          placeholder={tr("Street")}
          className={`col-span-6 ${inputClass}`}
        />
        <input
          value={streetNumber}
          onChange={(e) => setStreetNumber(e.target.value)}
          placeholder={tr("Number")}
          className={`col-span-3 ${inputClass}`}
        />
        <input
          value={floor}
          onChange={(e) => setFloor(e.target.value)}
          placeholder={tr("Floor")}
          className={`col-span-3 ${inputClass}`}
        />
        <input
          value={zipCode}
          onChange={(e) => setZipCode(e.target.value)}
          placeholder={tr("ZIP code")}
          className={`col-span-4 ${inputClass}`}
        />
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder={tr("City")}
          className={`col-span-8 ${inputClass}`}
        />
        <CountrySelect value={countryCode} onChange={changeCountry} className="col-span-12" />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <label className="text-sm font-medium">{tr("Phone numbers")}</label>
        <span className="text-xs text-muted-foreground">{tr("max 3")}</span>
      </div>
      <div className="mt-1 space-y-2">
        {phones.map((phone, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={phone}
              onChange={(e) => setPhones(phones.map((p, idx) => (idx === i ? e.target.value : p)))}
              placeholder={dial ? `${dial} 555 000 0000` : '+1 555 000 0000'}
              className={inputClass}
            />
            {phones.length > 1 && (
              <button
                type="button"
                aria-label={tr("Remove phone number")}
                onClick={() => setPhones(phones.filter((_, idx) => idx !== i))}
                className="rounded-md border border-input px-2 hover:bg-accent"
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
        ))}
        {phones.length < 3 && (
          <button
            type="button"
            onClick={() => setPhones([...phones, dial ? `${dial} ` : ''])}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            <Plus className="size-4" />{tr("Add number")}</button>
        )}
      </div>

      {isHandyman && (
        <>
          <div className={embedded ? 'mt-6 grid gap-4 md:grid-cols-2' : 'contents'}>
            <div>
              <label className="mt-4 block text-sm font-medium md:mt-0">{tr("Job title")}</label>
              <input
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder={tr("e.g. Electrician")}
                className={`mt-1 ${inputClass}`}
              />
            </div>
            <div>
              <label className="mt-4 block text-sm font-medium md:mt-0">{tr("Daily rate ($)")}</label>
              <input
                type="number"
                min="0"
                step="1"
                value={dailyRate}
                onChange={(e) => setDailyRate(e.target.value)}
                placeholder={tr("e.g. 150")}
                className={`mt-1 ${inputClass}`}
              />
            </div>
          </div>

          <label className="mt-4 block text-sm font-medium">{tr("Service area")}</label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={tr("e.g. Downtown, North district")}
            className={`mt-1 ${inputClass}`}
          />

          <label className="mt-4 block text-sm font-medium">{tr("Specialties")}</label>
          <input
            value={specialties}
            onChange={(e) => setSpecialties(e.target.value)}
            placeholder={tr("e.g. Plumbing, Tiling, Painting")}
            className={`mt-1 ${inputClass}`}
          />

          <label className="mt-4 block text-sm font-medium">{tr("Bio")}</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder={tr("Tell clients a bit about yourself and your experience.")}
            className={`mt-1 resize-y ${inputClass}`}
          />

          <label className="mt-5 flex items-start gap-3 rounded-md border border-input p-3 text-sm">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <strong className="block font-medium">{tr("Publicly visible")}</strong>
              <span className="text-muted-foreground">{tr("Show my profile in the handyman directory.")}</span>
            </span>
          </label>

          <label className="mt-3 flex items-start gap-3 rounded-md border border-input p-3 text-sm">
            <input
              type="checkbox"
              checked={available}
              onChange={(e) => setAvailable(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <strong className="block font-medium">{tr("Available for work")}</strong>
              <span className="text-muted-foreground">{tr("Clients can see that you are taking new requests.")}</span>
            </span>
          </label>
        </>
      )}

      <div className="mt-6 flex justify-end gap-2">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-input px-4 py-2 text-sm hover:bg-accent"
          >{tr("Cancel")}</button>
        )}
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {busy && <Loader2 className="size-4 animate-spin" />}{" "}{tr("Save changes")}</button>
      </div>
    </form>
  )
}

export function ProfileDialog({ viewer, onClose }: { viewer: Viewer; onClose: () => void }) {
  const { t: tr, locale } = useI18n();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-background p-6 text-foreground shadow-xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">{tr("Change profile")}</h2>
            <p className="text-sm text-muted-foreground">{viewer.email}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={tr("Close")} className="rounded-md p-1 hover:bg-accent">
            <X className="size-4" />
          </button>
        </div>
        <ProfileForm viewer={viewer} onClose={onClose} />
      </div>
    </div>
  )
}
