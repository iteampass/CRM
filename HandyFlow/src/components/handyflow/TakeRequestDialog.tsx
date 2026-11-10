import { arrivalProposalMode } from "@/lib/arrival-proposal";
import { RequestActivityLog } from "./RequestActivityLog";
import { ClientContact } from "./ClientContact";
import { useEffect, useState, type FormEvent } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, UserPlus, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  acceptOffer,
  advanceTaskStatus,
  askHandymanForTask,
  createOffer,
  getAskCandidates,
  rejectOffer,
  withdrawOffer,
  cancelTaskRequest,
  postponeTaskRequest,
  respondPostponeRequest,
  reportHandymanNoShow,
  STATUS_LABELS,
  takeTaskRequest,
  type OpenRequest,
} from '@/lib/handyflow.functions'


const inputCls =
  'mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'

const primaryCls =
  'inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60'

const secondaryCls =
  'inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent disabled:opacity-60'

export function TakeRequestDialog({
  request,
  role,
  onClose,
}: {
  request: OpenRequest
  role: 'client' | 'handyman' | 'admin'
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const take = useServerFn(takeTaskRequest)
  const advance = useServerFn(advanceTaskStatus)
  const offer = useServerFn(createOffer)
  const accept = useServerFn(acceptOffer)
  const reject = useServerFn(rejectOffer)
  const withdraw = useServerFn(withdrawOffer)
  const cancelRequest = useServerFn(cancelTaskRequest)
  const postpone = useServerFn(postponeTaskRequest)
  const respondPostpone = useServerFn(respondPostponeRequest)
  const reportNoShow = useServerFn(reportHandymanNoShow)
  const [postponeDate, setPostponeDate] = useState(request.postponeRequestedDate ?? request.arrivalDate ?? '')
  const [postponeTime, setPostponeTime] = useState((request.postponeRequestedTime ?? request.arrivalTime ?? '').slice(0, 5))

  const [price, setPrice] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const askCandidates = useServerFn(getAskCandidates)
  const ask = useServerFn(askHandymanForTask)
  const [askOpen, setAskOpen] = useState(false)
  const [askHandymanId, setAskHandymanId] = useState('')
  const [askEmail, setAskEmail] = useState('')
  const [askMessage, setAskMessage] = useState('')
  const candidatesQuery = useQuery({
    queryKey: ['ask-candidates'],
    queryFn: () => askCandidates(),
    enabled: askOpen,
  })

  async function handleAsk() {
    setBusy(true)
    try {
      const res = await ask({
        data: {
          taskId: request.id,
          ...(askHandymanId ? { handymanId: askHandymanId } : { email: askEmail.trim() }),
          message: askMessage,
        },
      })
      await refresh()
      toast.success(
        res.asked === 'email'
          ? `Invitation sent to ${res.name}`
          : `${res.name} was asked to take this request`,
      )
      setAskOpen(false)
      setAskHandymanId('')
      setAskEmail('')
      setAskMessage('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not ask the handyman')
    } finally {
      setBusy(false)
    }
  }


  const scheduleMode = arrivalProposalMode(request.status, request.postponedTo, request.arrivalTime);
  const initialArrival = scheduleMode === "initial";
  const status = request.status
  const isClient = request.mineAsClient || role === 'client'
  const myPendingOffer = request.offers.find((o) => o.mine && o.status === 'pending') ?? null

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['workspace'] })
    await queryClient.invalidateQueries({ queryKey: ['task-log', request.id] })
  }

  const arrivalAt =
    request.arrivalDate && request.arrivalTime
      ? new Date(`${request.arrivalDate}T${request.arrivalTime.slice(0, 8)}`)
      : null
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [])
  const canReportNoShow =
    isClient &&
    status === 'agreed' &&
    arrivalAt !== null &&
    !Number.isNaN(arrivalAt.getTime()) &&
    now >= arrivalAt.getTime() + 30 * 60 * 1000

  const postponeRequestLabel = `${request.postponeRequestedDate ?? ''}${
    request.postponeRequestedTime ? ` at ${request.postponeRequestedTime.slice(0, 5)}` : ''
  }`
  const closed = status === 'completed' || status === 'cancelled'
  const beforeAgreement = status === 'pending' || status === 'negotiating'
  const isParticipant = isClient || request.takenByMe
  const canCancelOutright = isClient && beforeAgreement && !closed
  const canRequestCancel = isParticipant && !beforeAgreement && !closed

  async function handleCancel() {
    setBusy(true)
    try {
      const res = (await cancelRequest({ data: { taskId: request.id } })) as {
        cancelled: boolean
      }
      await refresh()
      toast.success(
        res.cancelled
          ? 'Request cancelled'
          : 'Cancellation requested — waiting for the other side to agree',
      )
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not cancel the request')
      setBusy(false)
    }
  }

  async function handlePostpone(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const res = (await postpone({
        data: { taskId: request.id, date: postponeDate, time: postponeTime },
      })) as {
        pending: boolean
      }
      await refresh()
      toast.success(
        res.pending
          ? (initialArrival ? 'Arrival proposed — waiting for the client to accept' : 'Postpone requested — waiting for the client to accept')
          : 'Request postponed',
      )
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not postpone the request')
      setBusy(false)
    }
  }


  async function handleRespondPostpone(accept: boolean) {
    setBusy(true)
    try {
      await respondPostpone({ data: { taskId: request.id, accept } })
      await refresh()
      toast.success(accept ? 'Arrival date and time accepted' : 'Arrival proposal declined')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not answer the postpone request')
      setBusy(false)
    }
  }

  async function handleNoShow() {
    setBusy(true)
    try {
      await reportNoShow({ data: { taskId: request.id } })
      await refresh()
      toast.success('Reported — the request is open for handymen again')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not report the no-show')
      setBusy(false)
    }
  }

  async function handleTake() {
    setBusy(true)
    try {
      await take({ data: { taskId: request.id } })
      await refresh()
      toast.success('Request taken — you can now make an offer')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not take this request')
      setBusy(false)
    }
  }

  async function handleOffer(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await offer({ data: { taskId: request.id, price: Number(price), message } })
      await refresh()
      toast.success('Offer sent to the client')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send the offer')
      setBusy(false)
    }
  }

  async function handleAccept(offerId: string) {
    setBusy(true)
    try {
      await accept({ data: { offerId } })
      await refresh()
      toast.success('Offer accepted — request agreed')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not accept the offer')
      setBusy(false)
    }
  }

  async function handleReject(offerId: string, mode: 'decline' | 'another') {
    setBusy(true)
    try {
      await reject({ data: { offerId, mode } })
      await refresh()
      toast.success(
        mode === 'another' ? 'Asked the handyman for another offer' : 'Offer declined',
      )
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update the offer')
      setBusy(false)
    }
  }

  async function handleWithdraw(offerId: string) {
    setBusy(true)
    try {
      await withdraw({ data: { offerId } })
      await refresh()
      toast.success('Offer withdrawn — the request is open again')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not withdraw the offer')
      setBusy(false)
    }
  }


  async function handleStatus(next: 'in_progress' | 'completed') {
    setBusy(true)
    try {
      await advance({ data: { taskId: request.id, status: next } })
      await refresh()
      toast.success(`Status set to ${STATUS_LABELS[next]}`)
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update the status')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-background p-6 text-foreground shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">{request.title}</h2>
            <p className="text-sm text-muted-foreground">
              {request.client} · {request.category}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 hover:bg-accent">
            <X className="size-4" />
          </button>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-muted-foreground">Status</dt>
            <dd className="font-medium">{STATUS_LABELS[status] ?? status}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Priority</dt>
            <dd className="font-medium">{request.priority}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Location</dt>
            <dd className="font-medium">{request.location}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Preferred date</dt>
            <dd className="font-medium">{request.deadline}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{request.postponeRequested ? 'Proposed arrival · awaiting client approval' : request.postponedTo ? 'Agreed arrival' : 'Requested arrival'}</dt>
            <dd className="font-medium">
              {request.postponeRequested
                ? `${request.postponeRequestedDate ?? 'Date not set'} ${request.postponeRequestedTime?.slice(0, 5) ?? ''}`
                : `${request.arrivalDate ?? 'Date not set'} ${request.arrivalTime?.slice(0, 5) ?? '· time not set'}`}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Budget</dt>
            <dd className="font-medium">{request.budget}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Country</dt>
            <dd className="font-medium">{request.clientCountry || '—'}</dd>
          </div>
        </dl>

        {request.description && (
          <>
            <h3 className="mt-5 text-sm font-medium">Description</h3>
            <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{request.description}</p>
          </>
        )}

        {role === "handyman" && (!request.assigned || request.takenByMe) && <ClientContact taskId={request.id} />}

        {/* Handyman: not taken yet → only "Take request" */}
        {!isClient && !request.assigned && (
          <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-5">
            <button type="button" onClick={() => void handleTake()} disabled={busy} className={primaryCls}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              Take request
            </button>
          </div>
        )}

        {/* Handyman: offer sent, waiting for the client → withdraw */}
        {!isClient && request.takenByMe && myPendingOffer && (
          <div className="mt-5 border-t border-border pt-5">
            <h3 className="text-sm font-medium">Your offer</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              ${myPendingOffer.price}
              {myPendingOffer.message ? ` · ${myPendingOffer.message}` : ''} — waiting for the client
            </p>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => void handleWithdraw(myPendingOffer.id)}
                disabled={busy}
                className={secondaryCls}
              >
                {busy && <Loader2 className="size-4 animate-spin" />}
                Withdraw offer
              </button>
            </div>
          </div>
        )}

        {/* Handyman: taken by me → make an offer */}
        {!isClient && request.takenByMe && !myPendingOffer && beforeAgreement && (

          <form onSubmit={handleOffer} className="mt-5 border-t border-border pt-5">
            <h3 className="text-sm font-medium">Make an offer</h3>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-muted-foreground">Price ($)</label>
                <input
                  type="number"
                  min="1"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                  placeholder="180"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground">Message</label>
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="I can start tomorrow"
                  className={inputCls}
                />
              </div>
            </div>
            {request.offers.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                {request.offers.map((o) => (
                  <li key={o.id}>
                    ${o.price} — {STATUS_LABELS[o.status] ?? o.status}
                    {o.message ? ` · ${o.message}` : ''}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex justify-end">
              <button type="submit" disabled={busy} className={primaryCls}>
                {busy && <Loader2 className="size-4 animate-spin" />}
                Send offer
              </button>
            </div>
          </form>
        )}

        {/* Client: review offers and drive the status */}
        {isClient && (
          <div className="mt-5 border-t border-border pt-5">
            {beforeAgreement && (
            <>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-medium">Offers</h3>
              {!request.assigned && !closed && (
                <button
                  type="button"
                  onClick={() => setAskOpen((v) => !v)}
                  className={secondaryCls}
                >
                  <UserPlus className="size-4" />
                  Ask a handyman
                </button>
              )}
            </div>

            {askOpen && !request.assigned && !closed && (
              <div className="mt-3 rounded-md border border-border p-3">
                <label className="block text-sm text-muted-foreground">Choose a handyman</label>
                <select
                  value={askHandymanId}
                  onChange={(e) => {
                    setAskHandymanId(e.target.value)
                    if (e.target.value) setAskEmail('')
                  }}
                  className={inputCls}
                >
                  <option value="">
                    {candidatesQuery.isPending ? 'Loading…' : 'Select from handymen…'}
                  </option>
                  {(candidatesQuery.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} · {c.role}
                      {c.worked ? ' · worked with you' : ''}
                      {c.available ? '' : ' · busy'}
                    </option>
                  ))}
                </select>

                <label className="mt-3 block text-sm text-muted-foreground">
                  Or invite by email
                </label>
                <input
                  type="email"
                  value={askEmail}
                  onChange={(e) => {
                    setAskEmail(e.target.value)
                    if (e.target.value) setAskHandymanId('')
                  }}
                  placeholder="handyman@example.com"
                  className={inputCls}
                />

                <label className="mt-3 block text-sm text-muted-foreground">Message (optional)</label>
                <input
                  value={askMessage}
                  onChange={(e) => setAskMessage(e.target.value)}
                  placeholder="Could you take this job?"
                  className={inputCls}
                />

                <div className="mt-3 flex justify-end gap-2">
                  <button type="button" onClick={() => setAskOpen(false)} className={secondaryCls}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleAsk()}
                    disabled={busy || (!askHandymanId && !askEmail.trim())}
                    className={primaryCls}
                  >
                    {busy && <Loader2 className="size-4 animate-spin" />}
                    Send request
                  </button>
                </div>
              </div>
            )}

            {request.offers.length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">No offers yet.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {request.offers.map((o) => (
                  <li
                    key={o.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <div>
                      <strong>${o.price}</strong> · {o.handyman}
                      {o.message && <p className="text-muted-foreground">{o.message}</p>}
                    </div>
                    {o.status === 'pending' && status === 'negotiating' ? (
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => void handleAccept(o.id)}
                          disabled={busy}
                          className={primaryCls}
                        >
                          Accept price offer
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleReject(o.id, 'another')}
                          disabled={busy}
                          className={secondaryCls}
                        >
                          Ask for another offer
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleReject(o.id, 'decline')}
                          disabled={busy}
                          className={secondaryCls}
                        >
                          Decline
                        </button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">{STATUS_LABELS[o.status] ?? o.status}</span>
                    )}

                  </li>
                ))}
              </ul>
            )}
            </>
            )}

            {beforeAgreement && request.postponedTo && request.arrivalTime && (
              <div className="mt-4 rounded-md border border-border p-3">
                <p className="text-sm font-medium">Arrival accepted: {request.postponedTo} at {request.arrivalTime.slice(0, 5)}</p>
                <p className="mt-1 text-sm text-muted-foreground" id="start-work-requirement">
                  {request.offers.some((offer) => offer.status === 'pending')
                    ? 'Accept a price offer above to confirm the job and enable Start work. Your arrival date and time are already saved.'
                    : 'The handyman needs to send a new price offer for you to accept. Your arrival date and time are already saved.'}
                </p>
                <button type="button" disabled aria-describedby="start-work-requirement" className={`${primaryCls} mt-3`}>
                  Handyman arrived — start work
                </button>
              </div>
            )}

            {status === 'agreed' && (
              <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                {arrivalAt && !Number.isNaN(arrivalAt.getTime()) && (
                  <p className="mr-auto text-sm text-muted-foreground">
                    Agreed arrival: {arrivalAt.toLocaleString()}
                    {!canReportNoShow && ' · no-show can be reported 30 min later'}
                  </p>
                )}
                <button type="button" onClick={() => void handleStatus('in_progress')} disabled={busy} className={primaryCls}>
                  {busy && <Loader2 className="size-4 animate-spin" />}
                  Handyman arrived — start work
                </button>
                {canReportNoShow && (
                  <button
                    type="button"
                    onClick={() => void handleNoShow()}
                    disabled={busy}
                    className="inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    {busy && <Loader2 className="size-4 animate-spin" />}
                    Handyman did not arrive
                  </button>
                )}
              </div>
            )}
            {status === 'in_progress' && (
              <div className="mt-4 flex justify-end">
                <button type="button" onClick={() => void handleStatus('completed')} disabled={busy} className={primaryCls}>
                  {busy && <Loader2 className="size-4 animate-spin" />}
                  Mark completed
                </button>
              </div>
            )}
          </div>
        )}

        {/* Initial arrival proposals are separate from changes to an agreed schedule. */}
        {isParticipant && !closed && (
          <div className="mt-5 border-t border-border pt-5">
            <h3 className="text-sm font-medium">{initialArrival ? "Propose arrival" : "Arrival schedule"}</h3>
            {initialArrival && <p className="mt-2 text-sm text-muted-foreground">The handyman proposes an exact date and time. The client must accept it.</p>}
            {scheduleMode === "waiting" && <p className="mt-2 text-sm text-muted-foreground">Arrival accepted: {request.postponedTo} at {request.arrivalTime?.slice(0, 5)}. {isClient ? "Accept a price offer to confirm the job." : "Send a price offer for the client to accept."}</p>}
            {request.postponeRequested && (
              <div className="mt-2 rounded-md border border-border p-3 text-sm">
                <p className="text-muted-foreground">
                  {request.postponeRequestedByMe
                    ? `You ${initialArrival ? "proposed arrival" : "asked to postpone arrival"} at ${postponeRequestLabel} — waiting for the client.`
                    : `The handyman ${initialArrival ? "proposed arrival" : "asked to postpone arrival"} at ${postponeRequestLabel}.`}
                  {request.postponeReason ? ` Reason: ${request.postponeReason}` : ''}
                </p>
                {isClient && (
                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => void handleRespondPostpone(true)}
                      disabled={busy}
                      className={primaryCls}
                    >
                      {busy && <Loader2 className="size-4 animate-spin" />}
                      Accept date and time
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleRespondPostpone(false)}
                      disabled={busy}
                      className={secondaryCls}
                    >
                      Decline
                    </button>
                  </div>
                )}
              </div>
            )}
            {request.cancelRequested && (
              <p className="mt-1 text-sm text-muted-foreground">
                {request.cancelRequestedByMe
                  ? 'You asked to cancel — waiting for the other side to agree.'
                  : 'The other side asked to cancel. Confirm to cancel the request.'}
              </p>
            )}
            {!beforeAgreement && !request.cancelRequested && (
              <p className="mt-1 text-sm text-muted-foreground">
                The price is agreed — cancelling now needs both sides to agree. Otherwise the
                request can only be postponed.
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-end gap-2">
              {request.offers.length > 0 && (canCancelOutright || canRequestCancel) && (
                <button
                  type="button"
                  onClick={() => void handleCancel()}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {busy && <Loader2 className="size-4 animate-spin" />}
                  {canCancelOutright
                    ? 'Cancel request'
                    : request.cancelRequested && !request.cancelRequestedByMe
                      ? 'Agree and cancel'
                      : 'Request cancellation'}
                </button>
              )}
              {(scheduleMode === "postpone" || (initialArrival && !isClient)) && <form onSubmit={handlePostpone} className="flex flex-wrap items-end gap-2">
                <div>
                  <label className="block text-sm text-muted-foreground">{initialArrival ? "Arrival date" : "Postpone to"}</label>
                  <input
                    type="date"
                    value={postponeDate}
                    onChange={(e) => setPostponeDate(e.target.value)}
                    required
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground">Arrival time</label>
                  <input
                    type="time"
                    value={postponeTime}
                    onChange={(e) => setPostponeTime(e.target.value)}
                    required
                    className={inputCls}
                  />
                </div>
                <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-md bg-yellow-400 px-3 py-2 text-sm font-medium text-black hover:bg-yellow-500 disabled:opacity-60">
                  {initialArrival ? 'Propose arrival' : isClient ? 'Postpone' : 'Ask to postpone'}
                </button>
              </form>}
            </div>
          </div>
        )}

        {/* Negotiation log */}
        <div className="mt-5 border-t border-border pt-5">
          <h3 className="text-sm font-medium">Activity log</h3>
          <RequestActivityLog taskId={request.id} />
        </div>
      </div>
    </div>
  )
}
