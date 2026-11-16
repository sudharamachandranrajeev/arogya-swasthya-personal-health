// What the Exercise page's tabs share: the person's record as facts, the
// rules that apply, the readiness answers, the plan and the session log.

import { api } from './api.ts'
import { advise, evaluate, factsFrom, fromResponse, isReadiness, stops, toResponse, unknown, type Readiness } from './model/exrules.ts'
import { defaults, fromObservation, isExerciseLog, isExercisePlan, settingsOf, toCarePlan, toObservation, week, type Log, type Settings } from './model/explan.ts'
import type { Resource } from './model/fhir.ts'
import { session } from './session.svelte.ts'

export const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

class ExerciseState {
  records = $state<Resource[]>([])
  loaded = $state(false)
  day = $state(today())

  facts = $derived(factsFrom(this.records, session.person, this.day))
  hits = $derived(evaluate(this.facts))
  stops = $derived(stops(this.hits))
  unknown = $derived(unknown(this.facts, this.hits))
  older = $derived((this.facts.age ?? 0) >= 65)

  readinessRecord = $derived(this.records.filter(isReadiness).sort((a, b) => String(b.authored).localeCompare(String(a.authored)))[0])
  readiness = $derived(this.readinessRecord ? fromResponse(this.readinessRecord) : null)
  advice = $derived(this.readiness ? advise(this.readiness) : null)

  planRecord = $derived(this.records.find((r) => isExercisePlan(r) && r.status === 'active'))
  settings = $derived(this.planRecord ? settingsOf(this.planRecord) : null)
  /** The settings in use, capped by the readiness advice. */
  effective = $derived.by((): Settings | null => {
    const s = this.settings
    if (!s) return null
    const cap = this.advice?.cap ?? 1
    return { ...s, level: Math.min(s.level, cap) as Settings['level'] }
  })
  week = $derived(this.effective ? week(this.effective, this.hits, this.day, this.older) : [])

  logRecords = $derived(this.records.filter(isExerciseLog))
  logs = $derived(this.logRecords.map(fromObservation))

  async load(person: string) {
    const types = ['Condition', 'Procedure', 'MedicationStatement', 'Observation', 'CarePlan', 'QuestionnaireResponse']
    const lists = await Promise.all(types.map((t) => api.records(person, t)))
    this.records = lists.flat()
    this.loaded = true
  }

  async saveReadiness(r: Readiness) {
    await api.save(toResponse(r, session.current))
    // A first check starts a plan at the level it allows.
    if (!this.settings) await this.savePlan(defaults(today(), advise(r).cap === 3 ? 2 : 1), false)
    await session.changed('Saved the readiness check.')
  }

  async savePlan(s: Settings, announce = true) {
    const days = week(s, this.hits, today(), this.older)
    await api.save(toCarePlan(s, days, session.current, this.planRecord))
    if (announce) await session.changed('Saved the exercise plan.')
  }

  async log(entries: Log[]) {
    const obs = entries.map((l) => {
      const old = this.logRecords.find((r) => {
        const x = fromObservation(r)
        return x.id === l.id && x.date === l.date
      })
      return toObservation(l, session.current, old)
    })
    await api.saveAll(obs, `log ${obs.length} exercise${obs.length === 1 ? '' : 's'}`)
    await session.changed(`Logged ${obs.length} exercise${obs.length === 1 ? '' : 's'}.`)
  }
}

export const exercise = new ExerciseState()
