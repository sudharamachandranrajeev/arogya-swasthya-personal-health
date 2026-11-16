// Exercise plans, the session log and weekly progression.
//
// A plan is a FHIR CarePlan. Its settings (days, minutes, goal, doses, swaps,
// clearances) are kept as JSON in one extension so nothing is lost, and the
// chosen exercises are also written out as CarePlan activities for anyone
// reading the export. Each exercise done or skipped is one Observation in the
// "activity" category with the details as components.

import { byId, EXERCISES, showDose, type Area, type Dose, type Exercise, type Group, type Kit } from './exercises.ts'
import { reasons, type Hit } from './exrules.ts'
import { getPath, OBS_CATEGORY, type Resource } from './fhir.ts'

export const EX_SYSTEM = 'urn:arogya-swasthya:exercise'
const LOG_SYSTEM = 'urn:arogya-swasthya:exercise-log'
const PLAN_EXT = 'urn:arogya-swasthya:exercise-plan-settings'

export type Goal = 'general' | 'strength' | 'balance' | 'flexibility' | 'back' | 'yoga'
export const GOALS: [Goal, string][] = [
  ['general', 'All-round health'],
  ['strength', 'Get stronger'],
  ['balance', 'Steadier on my feet'],
  ['flexibility', 'Move more freely'],
  ['back', 'A stronger back'],
  ['yoga', 'Mostly yoga'],
]
export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export interface Settings {
  /** 0 = Monday. */
  days: number[]
  minutes: 10 | 20 | 30 | 45
  /** Optional kit on top of a chair, a wall and the floor. */
  kit: Kit[]
  goal: Goal
  yoga: boolean
  /** Ayurveda tradition notes shown with the plan. */
  ayurveda: boolean
  /** Highest level used when choosing exercises. */
  level: 1 | 2 | 3
  /** A part of the body to give extra attention, until a date. */
  focus?: { area: Area; until: string }
  /** First day of the plan; rotation counts weeks from here. */
  start: string
  doses: Record<string, Dose>
  /** "Stop this one": the exercise and what replaced it. */
  swaps: Record<string, string>
  /** Exercises the person was cleared to do by their team, despite a rule. */
  cleared: Record<string, { date: string; note: string }>
}

export function defaults(today: string, level: 1 | 2 | 3 = 1): Settings {
  return { days: [0, 2, 4], minutes: 20, kit: [], goal: 'general', yoga: false, ayurveda: false, level, start: today, doses: {}, swaps: {}, cleared: {} }
}

// ---- choosing exercises ----

const BASE_KIT: Kit[] = ['none', 'chair', 'wall']

/** Whether an exercise fits the kit, level, rules and the person's own choices. */
export function fits(ex: Exercise, s: Settings, hits: Hit[]): boolean {
  if (!BASE_KIT.includes(ex.kit) && !s.kit.includes(ex.kit)) return false
  if (ex.level > s.level) return false
  if (Object.prototype.hasOwnProperty.call(s.swaps, ex.id)) return false
  if (!s.yoga && s.goal !== 'yoga' && ex.group === 'yoga') return false
  return s.cleared[ex.id] !== undefined || reasons(ex, hits).length === 0
}

const LOWER: Area[] = ['hip', 'knee', 'ankle']
const UPPER: Area[] = ['shoulder', 'arm', 'wrist', 'upper-back']
const MIDDLE: Area[] = ['core', 'lower-back']

type Slot = { group: Group; areas?: Area[]; minutes?: number }

/** The shape of one session: what kinds of exercise, in order. */
export function slots(s: Settings, index: number, older: boolean): Slot[] {
  const m = s.minutes
  const nStrength = { 10: 1, 20: 2, 30: 3, 45: 4 }[m] + (s.goal === 'strength' ? 1 : 0) - (s.goal === 'yoga' ? 1 : 0)
  const nBalance = (older || s.goal === 'balance' ? 1 : index % 2 === 0 ? 1 : 0) + (s.goal === 'balance' || m === 45 ? 1 : 0)
  const nYoga = s.goal === 'yoga' ? Math.max(2, Math.round(m / 10)) : s.yoga ? 1 : 0
  const aerobic = Math.max(5, Math.round(m / 2) - (s.goal === 'strength' ? 5 : 0) - (s.goal === 'yoga' ? 5 : 0))
  // Strength rotates through legs, upper body and the middle across sessions.
  const order = [LOWER, UPPER, MIDDLE]
  const strength: Slot[] = Array.from({ length: Math.max(0, nStrength) }, (_, i) => ({
    group: 'strength',
    areas: s.goal === 'back' && i === 0 ? ['lower-back', 'upper-back'] : order[(index + i) % 3],
  }))
  return [
    { group: 'flexibility' },
    ...(m >= 10 ? [{ group: 'aerobic', minutes: aerobic } as Slot] : []),
    ...strength,
    ...Array.from({ length: nBalance }, () => ({ group: 'balance' }) as Slot),
    ...Array.from({ length: nYoga }, () => ({ group: 'yoga' }) as Slot),
    ...(s.goal === 'flexibility' ? [{ group: 'flexibility' } as Slot] : []),
    { group: s.yoga || s.goal === 'yoga' ? 'breathing' : 'flexibility' },
  ]
}

/** Weeks since the plan started (0 for the first week). */
export const weekOf = (s: Settings, date: string) => Math.max(0, Math.floor((Date.parse(date) - Date.parse(s.start)) / (7 * 86_400_000)))

export interface Item {
  exercise: Exercise
  dose: Dose
}

/** Preference order: rule and focus preferences first, then higher levels
 *  (up to the plan's level), then library order. */
function ranked(pool: Exercise[], s: Settings, hits: Hit[], today: string) {
  const preferTags = new Set(hits.flatMap((h) => h.rule.effect.prefer ?? []))
  const focus = s.focus && s.focus.until >= today ? s.focus.area : undefined
  const chosen = new Set(Object.values(s.swaps))
  const score = (e: Exercise) =>
    (chosen.has(e.id) ? 8 : 0) + (e.tags.some((t) => preferTags.has(t)) ? 4 : 0) + (focus && e.areas.includes(focus) ? 4 : 0) + e.level
  return pool.map((e, i) => ({ e, i, sc: score(e) })).sort((a, b) => b.sc - a.sc || a.i - b.i)
}

/** One session's exercises. The same plan gives the same session for a week
 *  block; the choice rotates every 4 weeks so it does not stay the same. */
export function session(s: Settings, hits: Hit[], index: number, date: string, older = false): Item[] {
  const block = Math.floor(weekOf(s, date) / 4)
  const used = new Set<string>()
  const out: Item[] = []
  for (const slot of slots(s, index, older)) {
    let pool = EXERCISES.filter((e) => e.group === slot.group && fits(e, s, hits) && !used.has(e.id))
    if (slot.areas) {
      const narrowed = pool.filter((e) => e.areas.some((a) => slot.areas!.includes(a)))
      if (narrowed.length) pool = narrowed
    }
    if (!pool.length) continue
    const list = ranked(pool, s, hits, date)
    // Rotate among up to three near-equal best choices, so preferences hold
    // but the plan does not stay the same month after month.
    const top = list.filter((x) => x.sc >= list[0].sc - 1).slice(0, 3).map((x) => x.e)
    const ex = top[(block + index) % top.length]
    used.add(ex.id)
    const dose = { ...ex.dose, ...s.doses[ex.id] }
    if (slot.minutes && ex.group === 'aerobic' && !s.doses[ex.id]?.minutes) dose.minutes = slot.minutes
    out.push({ exercise: ex, dose })
  }
  return out
}

export interface Day {
  date: string
  weekday: number
  items: Item[]
}

const iso = (d: Date) => d.toISOString().slice(0, 10)
/** Monday of the week a date falls in. */
export function monday(date: string): string {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  return iso(d)
}
const addDays = (date: string, n: number) => {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return iso(d)
}

/** The plan for the week that holds `date`. */
export function week(s: Settings, hits: Hit[], date: string, older = false): Day[] {
  const mon = monday(date)
  return [...s.days].sort((a, b) => a - b).map((wd, i) => {
    const day = addDays(mon, wd)
    return { date: day, weekday: wd, items: session(s, hits, i, day, older) }
  })
}

/** Weekly totals against the UK CMO guidelines. */
export function targets(days: Day[], older: boolean) {
  let aerobic = 0
  let strengthDays = 0
  let balanceDays = 0
  for (const d of days) {
    for (const it of d.items) if (it.exercise.group === 'aerobic') aerobic += it.dose.minutes ?? 0
    if (d.items.some((it) => it.exercise.group === 'strength')) strengthDays++
    if (d.items.some((it) => it.exercise.group === 'balance' || it.exercise.group === 'yoga')) balanceDays++
  }
  return {
    aerobic, aerobicGoal: 150,
    strengthDays, strengthGoal: 2,
    balanceDays, balanceGoal: older ? 2 : 0,
  }
}

// ---- the CarePlan ----

export const isExercisePlan = (r: Resource) =>
  r.resourceType === 'CarePlan' && ((r.extension as { url?: string }[] | undefined) ?? []).some((e) => e.url === PLAN_EXT)

export function settingsOf(plan: Resource): Settings | null {
  const ext = ((plan.extension as { url?: string; valueString?: string }[] | undefined) ?? []).find((e) => e.url === PLAN_EXT)
  try {
    return ext?.valueString ? (JSON.parse(ext.valueString) as Settings) : null
  } catch {
    return null
  }
}

export function toCarePlan(s: Settings, days: Day[], person: string, old?: Resource): Resource {
  const p: Resource = old
    ? JSON.parse(JSON.stringify(old))
    : { resourceType: 'CarePlan', status: 'active', intent: 'plan', created: s.start }
  p.subject = { reference: `Patient/${person}` }
  p.title = 'Exercise plan'
  p.category = [{ text: 'Exercise' }]
  p.description = `${GOALS.find(([g]) => g === s.goal)?.[1] ?? 'Exercise'}: ${s.days.length} days a week, about ${s.minutes} minutes.`
  p.period = { start: s.start }
  p.extension = [...((p.extension as { url?: string }[] | undefined) ?? []).filter((e) => e.url !== PLAN_EXT), { url: PLAN_EXT, valueString: JSON.stringify(s) }]
  const seen = new Map<string, number[]>()
  for (const d of days) for (const it of d.items) seen.set(it.exercise.id, [...(seen.get(it.exercise.id) ?? []), d.weekday])
  p.activity = [...seen].map(([id, wds]) => ({
    detail: {
      code: { coding: [{ system: EX_SYSTEM, code: id }], text: byId.get(id)?.name ?? id },
      status: 'scheduled',
      scheduledString: wds.map((w) => DAY_NAMES[w]).join(', '),
      description: showDose(days.flatMap((d) => d.items).find((it) => it.exercise.id === id)!.dose),
    },
  }))
  return p
}

// ---- the session log ----

export type SkipReason = 'pain' | 'ill' | 'time' | 'kit' | 'dislike' | 'other'
export const SKIP_REASONS: [SkipReason, string][] = [
  ['pain', 'It hurt'],
  ['ill', 'Unwell or tired'],
  ['time', 'No time'],
  ['kit', 'Did not have what I needed'],
  ['dislike', 'Did not like it'],
  ['other', 'Something else'],
]

export interface Log {
  id: string
  date: string
  done: boolean
  sets?: number
  reps?: number
  seconds?: number
  minutes?: number
  /** How hard it felt, 0 to 10. */
  effort?: number
  /** Pain during, 0 to 10. */
  pain?: number
  /** Pain the next morning, 0 to 10. */
  painNext?: number
  skip?: SkipReason
  /** Skipped for good: replace it. */
  stop?: boolean
  note?: string
}

const COMP: (keyof Log)[] = ['done', 'sets', 'reps', 'seconds', 'minutes', 'effort', 'pain', 'painNext', 'skip', 'stop']

export const isExerciseLog = (r: Resource) =>
  r.resourceType === 'Observation' && ((getPath(r, 'code.coding') as { system?: string }[] | undefined) ?? []).some((c) => c.system === EX_SYSTEM)

export function toObservation(l: Log, person: string, old?: Resource): Resource {
  const o: Resource = old
    ? JSON.parse(JSON.stringify(old))
    : { resourceType: 'Observation', status: 'final', category: [{ coding: [{ system: OBS_CATEGORY, code: 'activity', display: 'Activity' }], text: 'Exercise' }] }
  o.code = { coding: [{ system: EX_SYSTEM, code: l.id }], text: byId.get(l.id)?.name ?? l.id }
  o.subject = { reference: `Patient/${person}` }
  o.effectiveDateTime = l.date
  o.component = COMP.filter((k) => l[k] !== undefined).map((k) => {
    const v = l[k]
    const value = typeof v === 'boolean' ? { valueBoolean: v } : typeof v === 'number' ? { valueInteger: Math.round(v) } : { valueString: String(v) }
    return { code: { coding: [{ system: LOG_SYSTEM, code: k }] }, ...value }
  })
  if (l.note) o.note = [{ text: l.note }]
  else delete o.note
  return o
}

export function fromObservation(o: Resource): Log {
  const l: Log = { id: String(getPath(o, 'code.coding.0.code') ?? ''), date: String(o.effectiveDateTime ?? '').slice(0, 10), done: false }
  for (const c of (o.component as Resource[] | undefined) ?? []) {
    const k = getPath(c, 'code.coding.0.code') as keyof Log
    if (!COMP.includes(k)) continue
    const v = c.valueBoolean ?? c.valueInteger ?? c.valueString
    ;(l as unknown as Record<string, unknown>)[k] = v
  }
  const note = getPath(o, 'note.0.text')
  if (typeof note === 'string') l.note = note
  return l
}

/** "Done · 2 × 10 · effort 4/10 · pain 2/10" for lists. */
export function showLog(l: Log): string {
  if (!l.done) return ['Skipped', SKIP_REASONS.find(([k]) => k === l.skip)?.[1], l.stop ? 'replace it' : ''].filter(Boolean).join(' · ')
  const amount = l.minutes ? `${l.minutes} min` : l.seconds ? `${l.sets ?? 1} × ${l.seconds} s` : l.reps ? `${l.sets ?? 1} × ${l.reps}` : ''
  return ['Done', amount, l.effort !== undefined ? `effort ${l.effort}/10` : '', l.pain ? `pain ${l.pain}/10` : '', l.painNext !== undefined ? `next morning ${l.painNext}/10` : '']
    .filter(Boolean).join(' · ')
}

// ---- weekly review and progression ----
// Pain-monitoring model (Silbernagel 2007): pain up to 5/10 during exercise is
// acceptable if it has settled by the next morning and morning pain is not
// rising week on week.

export type Suggestion =
  | { kind: 'step-up'; id: string; dose: Dose; why: string }
  | { kind: 'harder'; id: string; to: string; why: string }
  | { kind: 'step-back'; id: string; dose?: Dose; to?: string; why: string }
  | { kind: 'swap'; id: string; to: string | null; why: string }
  | { kind: 'shorter'; why: string }
  | { kind: 'clinician'; id: string; why: string }

const MAX = { reps: 15, sets: 3, seconds: 60, minutes: 30 }

export function stepUp(d: Dose): Dose | null {
  if (d.minutes !== undefined) return d.minutes < MAX.minutes ? { ...d, minutes: d.minutes + 5 } : null
  if (d.seconds !== undefined) return d.seconds < MAX.seconds ? { ...d, seconds: Math.min(MAX.seconds, d.seconds + 5) } : null
  if (d.reps !== undefined) {
    if (d.reps < MAX.reps) return { ...d, reps: Math.min(MAX.reps, d.reps + 2) }
    if ((d.sets ?? 1) < MAX.sets) return { ...d, sets: (d.sets ?? 1) + 1, reps: 10 }
  }
  return null
}

export function stepBack(d: Dose): Dose | null {
  if (d.minutes !== undefined) return d.minutes > 5 ? { ...d, minutes: d.minutes - 5 } : null
  if (d.seconds !== undefined) return d.seconds > 5 ? { ...d, seconds: Math.max(5, d.seconds - 5) } : null
  if (d.reps !== undefined) {
    if ((d.sets ?? 1) > 1) return { ...d, sets: (d.sets ?? 1) - 1 }
    if (d.reps > 4) return { ...d, reps: Math.max(4, d.reps - 2) }
  }
  return null
}

/** Another exercise of the same kind that uses the same parts and fits. */
export function replacement(ex: Exercise, s: Settings, hits: Hit[], avoid: Set<string>): Exercise | null {
  const pool = EXERCISES.filter((e) => e.id !== ex.id && e.group === ex.group && !avoid.has(e.id) && fits(e, s, hits))
  const same = pool.filter((e) => e.areas.some((a) => ex.areas.includes(a)))
  return (same.length ? same : pool).sort((a, b) => Math.abs(a.level - ex.level) - Math.abs(b.level - ex.level))[0] ?? null
}

/** Suggestions from the last two weeks of logs for the exercises in the
 *  current week. Nothing changes until the person accepts one. */
export function review(s: Settings, hits: Hit[], current: Item[], logs: Log[], today: string): Suggestion[] {
  const out: Suggestion[] = []
  const since = (days: number) => {
    const d = new Date(`${today}T12:00:00Z`)
    d.setUTCDate(d.getUTCDate() - days)
    return iso(d)
  }
  const recent = logs.filter((l) => l.date > since(14) && l.date <= today)
  const lastWeek = recent.filter((l) => l.date > since(7))
  const weekBefore = recent.filter((l) => l.date <= since(7))

  const noTime = lastWeek.filter((l) => !l.done && l.skip === 'time').length
  if (noTime >= 2) out.push({ kind: 'shorter', why: `Skipped for lack of time ${noTime} times this week. A shorter session you can keep to beats a longer one you skip.` })

  const replaced = new Set<string>()
  for (const it of current) {
    const ex = it.exercise
    const mine = recent.filter((l) => l.id === ex.id)
    const mineWeek = lastWeek.filter((l) => l.id === ex.id)
    if (!mine.length) continue
    const stopped = mine.find((l) => !l.done && l.stop)
    if (stopped) {
      const to = replacement(ex, s, hits, replaced)
      if (to) replaced.add(to.id)
      out.push({ kind: 'swap', id: ex.id, to: to?.id ?? null, why: `You asked to stop ${ex.name.toLowerCase()}.` })
      continue
    }
    const painful = mine.filter((l) => (l.pain ?? 0) > 5 || (l.painNext ?? 0) > 5 || l.skip === 'pain')
    const morning = (ls: Log[]) => {
      const xs = ls.filter((l) => l.id === ex.id && l.painNext !== undefined).map((l) => l.painNext!)
      return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null
    }
    const [m1, m2] = [morning(weekBefore), morning(lastWeek)]
    const rising = m1 !== null && m2 !== null && m2 > m1
    if (painful.length || rising) {
      const back = stepBack(it.dose)
      const why = rising
        ? 'Morning-after pain went up from last week. Ease off until it settles.'
        : 'Pain went above 5 out of 10, or did not settle by the next morning. Ease off until it settles.'
      if (back) out.push({ kind: 'step-back', id: ex.id, dose: back, why })
      else if (ex.easier && byId.get(ex.easier) && fits(byId.get(ex.easier)!, { ...s, level: 3 }, hits)) out.push({ kind: 'step-back', id: ex.id, to: ex.easier, why })
      else out.push({ kind: 'step-back', id: ex.id, why })
      if (painful.length >= 2 || rising) out.push({ kind: 'clinician', id: ex.id, why: `${ex.name} has been painful more than once. A physiotherapist or your GP can check what is going on.` })
      continue
    }
    const done = mineWeek.filter((l) => l.done)
    const easy = done.length >= 2 && done.every((l) => l.effort !== undefined && l.effort <= 5) && mineWeek.every((l) => l.done)
    if (easy) {
      const up = stepUp(it.dose)
      if (up) out.push({ kind: 'step-up', id: ex.id, dose: up, why: `Done ${done.length} times this week and it felt easy (effort 5 or less). Time for a little more.` })
      else if (ex.harder) {
        const h = byId.get(ex.harder)
        if (h && fits(h, { ...s, level: 3 }, hits)) out.push({ kind: 'harder', id: ex.id, to: h.id, why: `You have reached the top amount for ${ex.name.toLowerCase()}. ${h.name} is the next step.` })
      }
    }
  }
  return out
}

/** Apply a suggestion the person accepted. Returns new settings. */
export function apply(s: Settings, sug: Suggestion): Settings {
  const n: Settings = JSON.parse(JSON.stringify(s))
  switch (sug.kind) {
    case 'step-up':
      n.doses[sug.id] = sug.dose
      break
    case 'step-back':
      if (sug.dose) n.doses[sug.id] = sug.dose
      else if (sug.to) n.swaps[sug.id] = sug.to
      break
    case 'harder':
      n.swaps[sug.id] = sug.to
      if ((byId.get(sug.to)?.level ?? 1) > n.level) n.level = byId.get(sug.to)!.level
      break
    case 'swap':
      n.swaps[sug.id] = sug.to ?? ''
      break
    case 'shorter':
      n.minutes = n.minutes === 45 ? 30 : n.minutes === 30 ? 20 : 10
      break
    case 'clinician':
      break
  }
  return n
}
