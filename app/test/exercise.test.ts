// Exercise: the library, the safety rules, readiness, plans, the log and
// progression. Synthetic records only.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { AYURVEDA, byId, EXERCISES, showDose, SOURCES } from '../src/lib/model/exercises.ts'
import { advise, areasOf, evaluate, factsFrom, fromResponse, reasons, stops, toResponse, unknown, type Readiness } from '../src/lib/model/exrules.ts'
import {
  apply, defaults, fits, fromObservation, isExerciseLog, isExercisePlan, review, settingsOf, stepBack, stepUp,
  targets, toCarePlan, toObservation, week, type Log,
} from '../src/lib/model/explan.ts'
import { exercise, kindOf, result, type Resource } from '../src/lib/model/fhir.ts'

const TODAY = '2026-11-16'
const P = { reference: 'Patient/p1' }
const person = (birthDate = '1980-05-01'): Resource => ({ resourceType: 'Patient', id: 'p1', birthDate })
const cond = (name: string, site = '', status = 'active'): Resource => ({
  resourceType: 'Condition', subject: P, code: { text: name }, clinicalStatus: { coding: [{ code: status }] },
  ...(site ? { bodySite: [{ text: site }] } : {}),
})
const proc = (name: string, date: string, site = ''): Resource => ({
  resourceType: 'Procedure', subject: P, code: { text: name }, performedDateTime: date, ...(site ? { bodySite: [{ text: site }] } : {}),
})
const med = (name: string): Resource => ({ resourceType: 'MedicationStatement', subject: P, status: 'active', medicationCodeableConcept: { text: name } })
const bp = (s: number, d: number, date = TODAY): Resource => ({
  resourceType: 'Observation', subject: P, effectiveDateTime: date,
  category: [{ coding: [{ code: 'vital-signs' }] }],
  code: { coding: [{ system: 'http://loinc.org', code: '85354-9' }] },
  component: [
    { code: { coding: [{ system: 'http://loinc.org', code: '8480-6' }] }, valueQuantity: { value: s } },
    { code: { coding: [{ system: 'http://loinc.org', code: '8462-4' }] }, valueQuantity: { value: d } },
  ],
})
const hitsOf = (records: Resource[], who = person()) => evaluate(factsFrom(records, who, TODAY))
const leftOut = (records: Resource[], id: string) => reasons(byId.get(id)!, hitsOf(records)).map((h) => h.rule.id)

test('library: unique ids, links resolve, every item has steps and a known source', () => {
  assert.equal(byId.size, EXERCISES.length)
  assert.ok(EXERCISES.length >= 60)
  for (const e of EXERCISES) {
    assert.ok(e.steps.length >= 2, e.id)
    assert.ok(SOURCES[e.source], e.id)
    assert.ok(showDose(e.dose), e.id)
    for (const l of [e.easier, e.harder]) if (l) assert.ok(byId.has(l), `${e.id} -> ${l}`)
    if (e.easier) assert.ok(byId.get(e.easier)!.level <= e.level, `${e.id} easier`)
    if (e.harder) assert.ok(byId.get(e.harder)!.level >= e.level, `${e.id} harder`)
  }
})

test('library: no gym kit, only hand weights beyond a chair, wall or stairs', () => {
  const kits = new Set(EXERCISES.map((e) => e.kit))
  assert.deepEqual([...kits].sort(), ['chair', 'none', 'stairs', 'wall', 'weights'])
})

test('library: every group has a gentle level-1 option', () => {
  for (const g of ['aerobic', 'strength', 'balance', 'flexibility', 'yoga', 'breathing'])
    assert.ok(EXERCISES.some((e) => e.group === g && e.level === 1), g)
})

test('ayurveda notes are all labelled with their basis', () => {
  for (const t of AYURVEDA) assert.match(t.basis, /no trials|consistent/i)
})

test('dose text', () => {
  assert.equal(showDose({ sets: 2, reps: 10 }), '2 sets of 10')
  assert.equal(showDose({ sets: 2, seconds: 15, perSide: true }), 'hold 15 seconds, 2 times each side')
  assert.equal(showDose({ minutes: 1 }), '1 minute')
})

test('parts of the body from words', () => {
  assert.deepEqual(areasOf('Left knee'), ['knee'])
  assert.deepEqual(areasOf('Lower back'), ['lower-back'])
  assert.deepEqual(areasOf('Back pain').sort(), ['lower-back', 'upper-back'])
  assert.deepEqual(areasOf('Asthma'), [])
  assert.deepEqual(areasOf('Right leg').sort(), ['ankle', 'hip', 'knee'])
})

test('osteoporosis leaves out loaded forward bending and prefers back work', () => {
  assert.deepEqual(leftOut([cond('Osteoporosis')], 'curl-up'), ['osteoporosis'])
  assert.deepEqual(leftOut([cond('Osteoporosis')], 'pada-hastasana'), ['osteoporosis'])
  assert.deepEqual(leftOut([cond('Osteoporosis')], 'prone-lift'), [])
})

test('blood pressure readings: high limits straining, very high stops', () => {
  assert.ok(leftOut([bp(165, 95)], 'plank').includes('bp-high'))
  assert.equal(stops(hitsOf([bp(165, 95)])).length, 0)
  assert.deepEqual(stops(hitsOf([bp(185, 100)])).map((h) => h.rule.id), ['bp-very-high'])
  assert.equal(stops(hitsOf([bp(185, 100, '2026-09-01')])).length, 0, 'old readings do not count')
})

test('a painful knee keeps gentle knee moves and leaves out deep bends and kneeling', () => {
  const rs = [cond('Osteoarthritis', 'Right knee')]
  assert.deepEqual(leftOut(rs, 'sit-to-stand'), [])
  assert.ok(leftOut(rs, 'squat').includes('knee'))
  assert.ok(leftOut(rs, 'vajrasana').includes('knee'))
  assert.ok(leftOut(rs, 'step-up').includes('painful-area'))
  assert.deepEqual(leftOut(rs, 'bicep-curl'), [])
})

test('a recent operation leaves out that part until cleared; an old one does not', () => {
  const recent = [proc('Hip replacement', '2026-10-01', 'Left hip')]
  assert.ok(leftOut(recent, 'sit-to-stand').includes('recent-surgery'))
  assert.deepEqual(leftOut(recent, 'bicep-curl'), [])
  assert.deepEqual(leftOut([proc('Hip replacement', '2025-01-01', 'Left hip')], 'sit-to-stand'), [])
  assert.ok(leftOut([proc('Hernia repair', '2026-11-01')], 'plank').includes('recent-belly-surgery'))
})

test('pregnancy, glaucoma and resolved conditions', () => {
  assert.ok(leftOut([cond('Pregnancy')], 'dead-bug').includes('pregnancy'))
  assert.ok(leftOut([cond('Glaucoma')], 'shashankasana').includes('glaucoma'))
  assert.deepEqual(leftOut([cond('Osteoporosis', '', 'resolved')], 'curl-up'), [])
})

test('medicines add notes; recent chest pain stops', () => {
  const ids = hitsOf([med('Bisoprolol 2.5 mg'), med('Insulin glargine')]).map((h) => h.rule.id).sort()
  assert.deepEqual(ids, ['beta-blocker', 'diabetes-meds'])
  const chest: Resource = { resourceType: 'Observation', subject: P, effectiveDateTime: '2026-11-10', category: [{ text: 'Symptom' }], code: { text: 'Chest pain' }, valueInteger: 6 }
  assert.deepEqual(stops(hitsOf([chest])).map((h) => h.rule.id), ['chest-pain'])
})

test('conditions no rule knows are listed for the person to ask about', () => {
  const f = factsFrom([cond('Asthma'), cond('Gout', 'Left foot'), cond('Mystery condition')], person(), TODAY)
  assert.deepEqual(unknown(f, evaluate(f)).map((c) => c.name), ['Mystery condition'])
})

test('older people get balance preferred', () => {
  assert.ok(hitsOf([], person('1950-01-01')).some((h) => h.rule.id === 'older'))
})

// ---- readiness (ACSM 2015) ----

const ready = (x: Partial<Readiness>): Readiness => ({ date: TODAY, active: false, disease: false, signs: [], intensity: 'moderate', ...x })

test('readiness follows the ACSM algorithm', () => {
  assert.equal(advise(ready({})).outcome, 'start-light')
  assert.equal(advise(ready({ active: true })).outcome, 'go')
  assert.equal(advise(ready({ disease: true })).outcome, 'ask-first')
  assert.equal(advise(ready({ disease: true, active: true })).outcome, 'go')
  assert.equal(advise(ready({ disease: true, active: true, intensity: 'vigorous' })).outcome, 'ask-first')
  assert.equal(advise(ready({ signs: ['chest'] })).outcome, 'ask-first')
  assert.equal(advise(ready({ signs: ['chest'], active: true })).outcome, 'stop')
  assert.equal(advise(ready({ disease: true, cleared: '2026-11-10' })).outcome, 'start-light')
})

test('readiness round-trips through a QuestionnaireResponse', () => {
  const r = ready({ active: true, disease: true, signs: ['ankles', 'calf'], intensity: 'vigorous', cleared: '2026-11-01' })
  const q = toResponse(r, 'p1')
  assert.equal(q.resourceType, 'QuestionnaireResponse')
  assert.deepEqual(fromResponse(q), r)
  assert.equal(kindOf(q)?.title, 'Exercise readiness checks')
})

// ---- plans ----

test('a default plan meets the strength guideline and uses only fitting moves', () => {
  const s = defaults(TODAY)
  const hits = hitsOf([cond('Osteoporosis')])
  const days = week(s, hits, TODAY)
  assert.equal(days.length, 3)
  for (const d of days) {
    assert.ok(d.items.length >= 4, d.date)
    for (const it of d.items) {
      assert.ok(fits(it.exercise, s, hits), it.exercise.id)
      assert.notEqual(it.exercise.kit, 'weights')
      assert.equal(it.exercise.level, 1)
    }
    assert.equal(new Set(d.items.map((i) => i.exercise.id)).size, d.items.length, 'no repeats in a session')
  }
  assert.ok(targets(days, false).strengthDays >= 2)
  assert.equal(days[0].date, '2026-11-16')
})

test('the same week gives the same plan; four weeks later it rotates', () => {
  const s = { ...defaults('2026-01-05', 2), kit: ['weights' as const] }
  const ids = (date: string) => week(s, [], date).flatMap((d) => d.items.map((i) => i.exercise.id)).join(',')
  assert.equal(ids('2026-01-05'), ids('2026-01-07'))
  assert.equal(ids('2026-01-05'), ids('2026-01-26'))
  assert.notEqual(ids('2026-01-05'), ids('2026-02-02'))
})

test('yoga is only included when chosen', () => {
  const s = defaults(TODAY)
  const has = (x: typeof s) => week(x, [], TODAY).some((d) => d.items.some((i) => i.exercise.group === 'yoga'))
  assert.equal(has(s), false)
  assert.equal(has({ ...s, yoga: true }), true)
  assert.equal(has({ ...s, goal: 'yoga' }), true)
})

test('cleared by the team puts a left-out exercise back', () => {
  const s = { ...defaults(TODAY, 3) }
  const hits = hitsOf([cond('Osteoporosis')])
  assert.equal(fits(byId.get('curl-up')!, s, hits), false)
  assert.equal(fits(byId.get('curl-up')!, { ...s, cleared: { 'curl-up': { date: TODAY, note: 'physio' } } }, hits), true)
})

test('plan settings round-trip through a CarePlan', () => {
  const s = { ...defaults(TODAY), goal: 'balance' as const, focus: { area: 'knee' as const, until: '2026-12-31' } }
  const plan = toCarePlan(s, week(s, [], TODAY), 'p1')
  assert.ok(isExercisePlan(plan))
  assert.deepEqual(settingsOf(plan), s)
  assert.ok((plan.activity as unknown[]).length > 3)
  assert.equal(kindOf(plan)?.title, 'Exercise plans')
})

// ---- log ----

test('a log round-trips through an Observation and is not a test result', () => {
  const l: Log = { id: 'sit-to-stand', date: TODAY, done: true, sets: 2, reps: 10, effort: 4, pain: 2, painNext: 1, note: 'fine' }
  const o = toObservation(l, 'p1')
  assert.ok(isExerciseLog(o))
  assert.deepEqual(fromObservation(o), l)
  assert.equal(kindOf(o), exercise)
  assert.notEqual(kindOf(o), result)
  const skip: Log = { id: 'plank', date: TODAY, done: false, skip: 'pain', stop: true }
  assert.deepEqual(fromObservation(toObservation(skip, 'p1')), skip)
  assert.match(exercise.summary(toObservation(skip, 'p1')).sub, /Skipped · It hurt · replace it/)
})

// ---- progression ----

test('dose steps', () => {
  assert.deepEqual(stepUp({ sets: 2, reps: 10 }), { sets: 2, reps: 12 })
  assert.deepEqual(stepUp({ sets: 2, reps: 15 }), { sets: 3, reps: 10 })
  assert.equal(stepUp({ sets: 3, reps: 15 }), null)
  assert.deepEqual(stepUp({ minutes: 10 }), { minutes: 15 })
  assert.deepEqual(stepBack({ sets: 2, reps: 10 }), { sets: 1, reps: 10 })
  assert.deepEqual(stepBack({ sets: 1, reps: 4 }), null)
})

const days = (n: number) => { const d = new Date(`${TODAY}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10) }

test('review: easy and done steps up; painful steps back and suggests a clinician', () => {
  const s = defaults(TODAY)
  const items = [{ exercise: byId.get('sit-to-stand')!, dose: { sets: 2, reps: 8 } }, { exercise: byId.get('calf-raise')!, dose: { sets: 2, reps: 10 } }]
  const logs: Log[] = [
    { id: 'sit-to-stand', date: days(1), done: true, effort: 3 },
    { id: 'sit-to-stand', date: days(3), done: true, effort: 4 },
    { id: 'calf-raise', date: days(1), done: true, effort: 3, pain: 7 },
    { id: 'calf-raise', date: days(3), done: true, effort: 3, painNext: 6 },
  ]
  const out = review(s, [], items, logs, TODAY)
  assert.deepEqual(out.find((x) => x.id === 'sit-to-stand' && x.kind === 'step-up'), { kind: 'step-up', id: 'sit-to-stand', dose: { sets: 2, reps: 10 }, why: out[0].why })
  assert.ok(out.some((x) => x.kind === 'step-back' && x.id === 'calf-raise'))
  assert.ok(out.some((x) => x.kind === 'clinician' && 'id' in x && x.id === 'calf-raise'))
})

test('review: rising morning pain steps back even below 5', () => {
  const items = [{ exercise: byId.get('sit-to-stand')!, dose: { sets: 2, reps: 8 } }]
  const logs: Log[] = [
    { id: 'sit-to-stand', date: days(10), done: true, effort: 3, painNext: 1 },
    { id: 'sit-to-stand', date: days(2), done: true, effort: 3, painNext: 3 },
  ]
  assert.ok(review(defaults(TODAY), [], items, logs, TODAY).some((x) => x.kind === 'step-back'))
})

test('review: "stop this one" swaps it for a fitting move on the same parts; no time suggests shorter', () => {
  const s = defaults(TODAY)
  const items = [{ exercise: byId.get('side-leg-raise')!, dose: { sets: 2, reps: 10 } }]
  const logs: Log[] = [
    { id: 'side-leg-raise', date: days(1), done: false, skip: 'dislike', stop: true },
    { id: 'walk', date: days(2), done: false, skip: 'time' },
    { id: 'walk', date: days(4), done: false, skip: 'time' },
  ]
  const out = review(s, [], items, logs, TODAY)
  const swap = out.find((x) => x.kind === 'swap')
  assert.ok(swap && swap.kind === 'swap' && swap.to)
  assert.ok(byId.get(swap.to!)!.areas.includes('hip'))
  assert.ok(out.some((x) => x.kind === 'shorter'))
  const after = apply(s, swap)
  assert.equal(after.swaps['side-leg-raise'], swap.to)
  assert.equal(fits(byId.get('side-leg-raise')!, after, []), false)
  assert.equal(apply(s, { kind: 'shorter', why: '' }).minutes, 10)
})
