// Exercise safety: the readiness questions and the rules that fit exercises to
// a person's own record. Rules are data with a plain "why" and a source. They
// adapt a plan; they never clear anyone to exercise. Every exercise a rule
// leaves out can be put back by the person ("cleared by my team"), and that
// choice is kept with its date.

import { age } from './calc.ts'
import type { Area, Exercise, Tag } from './exercises.ts'
import { getPath, type Resource } from './fhir.ts'
import { vitalOf } from './vitals.ts'

// ---- facts from the record ----

export interface Fact {
  name: string
  site: string
  date: string
  record: Resource
}

export interface Facts {
  age?: number
  /** Active or recurring conditions. */
  conditions: Fact[]
  procedures: Fact[]
  /** Medicines taken now. */
  medicines: Fact[]
  /** Symptoms recorded in the last 14 days. */
  symptoms: Fact[]
  /** Newest blood pressure in the last 30 days. */
  bp?: { systolic: number; diastolic: number; date: string }
  today: string
}

const str = (r: unknown, path: string) => {
  const v = getPath(r, path)
  return typeof v === 'string' ? v : ''
}

const daysBetween = (a: string, b: string) => (Date.parse(b.slice(0, 10)) - Date.parse(a.slice(0, 10))) / 86_400_000

export function factsFrom(records: Resource[], person: Resource | undefined, today = new Date().toISOString().slice(0, 10)): Facts {
  const f: Facts = { age: age(str(person, 'birthDate')), conditions: [], procedures: [], medicines: [], symptoms: [], today }
  for (const r of records) {
    if (r.resourceType === 'Condition') {
      const status = str(r, 'clinicalStatus.coding.0.code')
      if (status === 'active' || status === 'recurrence' || status === 'relapse' || !status)
        f.conditions.push({ name: str(r, 'code.text'), site: str(r, 'bodySite.0.text'), date: str(r, 'onsetDateTime'), record: r })
    } else if (r.resourceType === 'Procedure') {
      f.procedures.push({ name: str(r, 'code.text'), site: str(r, 'bodySite.0.text'), date: str(r, 'performedDateTime') || str(r, 'performedPeriod.start'), record: r })
    } else if (r.resourceType === 'MedicationStatement') {
      if (str(r, 'status') === 'active' || !str(r, 'status'))
        f.medicines.push({ name: str(r, 'medicationCodeableConcept.text'), site: '', date: str(r, 'effectivePeriod.start'), record: r })
    } else if (r.resourceType === 'Observation') {
      const date = str(r, 'effectiveDateTime')
      const cat = (r.category as { text?: string }[] | undefined) ?? []
      if (cat.some((c) => c.text === 'Symptom') && date && daysBetween(date, today) <= 14 && daysBetween(date, today) >= 0)
        f.symptoms.push({ name: str(r, 'code.text'), site: '', date, record: r })
      if (vitalOf(r)?.key === 'bp' && date && daysBetween(date, today) <= 30 && (!f.bp || date > f.bp.date)) {
        const comps = (r.component as Resource[] | undefined) ?? []
        const val = (code: string) => comps.find((c) => JSON.stringify(c.code).includes(`"${code}"`))?.valueQuantity as { value?: number } | undefined
        const s = val('8480-6')?.value
        const d = val('8462-4')?.value
        if (s && d) f.bp = { systolic: s, diastolic: d, date }
      }
    }
  }
  return f
}

/** Parts of the body named in a "Part of the body" text or a condition name. */
export function areasOf(text: string): Area[] {
  const t = text.toLowerCase()
  const out = new Set<Area>()
  const add = (re: RegExp, ...as: Area[]) => { if (re.test(t)) as.forEach((a) => out.add(a)) }
  add(/\bneck\b|\bcervical\b|whiplash/, 'neck')
  add(/\bshoulders?\b|rotator cuff|frozen shoulder/, 'shoulder')
  add(/\b(arms?|elbows?|forearms?|tennis elbow|golfer)\b/, 'arm')
  add(/\b(hands?|wrists?|fingers?|thumbs?|carpal tunnel)\b/, 'wrist')
  add(/\bupper back\b|\bthoracic\b/, 'upper-back')
  add(/\blower back\b|\blumbar\b|sciatica|\bslipped disc\b|\bdisc\b/, 'lower-back')
  add(/^back$|\bback pain\b|\bspine\b|\bspinal\b/, 'lower-back', 'upper-back')
  add(/\b(abdomen|belly|tummy|hernia)\b/, 'core')
  add(/\b(hips?|pelvis|groin)\b/, 'hip')
  add(/\b(knees?|thighs?|meniscus|acl|patella)\b/, 'knee')
  add(/\b(feet|foot|ankles?|heels?|toes?|achilles|plantar|shins?|calf|calves)\b/, 'ankle')
  add(/\blegs?\b/, 'hip', 'knee', 'ankle')
  return [...out]
}

// ---- rules ----

export interface Effect {
  /** Leave out exercises with any of these tags. */
  avoid?: Tag[]
  /** For exercises that use the matched parts: 0 leaves them out, 1 or 2 keeps only that level and below. */
  areaCap?: 0 | 1 | 2
  /** Highest level for every exercise. */
  cap?: 1 | 2
  /** Put these first when building a plan. */
  prefer?: Tag[]
  preferGroups?: Exercise['group'][]
  /** Do not start a plan until this is sorted out. */
  stop?: boolean
}

export interface Rule {
  id: string
  title: string
  why: string
  source: { name: string; url: string }
  effect: Effect
  /** What in the record makes it apply. */
  when: (f: Facts) => { because: string; record?: Resource; areas?: Area[] }[]
}

export interface Hit {
  rule: Rule
  because: string
  record?: Resource
  areas: Area[]
}

const named = (re: RegExp, xs: Fact[]) => xs.filter((x) => re.test(`${x.name} ${x.site}`.toLowerCase()))
const each = (xs: Fact[], label = (x: Fact) => x.name) => xs.map((x) => ({ because: label(x), record: x.record }))

const SRC = {
  acsm: { name: 'ACSM pre-participation screening (Riebe et al., Med Sci Sports Exerc 2015)', url: 'https://doi.org/10.1249/MSS.0000000000000664' },
  osteo: { name: 'Strong, Steady and Straight: UK consensus on exercise for osteoporosis (BJSM 2022)', url: 'https://bjsm.bmj.com/content/56/15/837' },
  nice136: { name: 'NICE NG136: hypertension in adults', url: 'https://www.nice.org.uk/guidance/ng136' },
  ada: { name: 'ADA position statement: physical activity and diabetes (Diabetes Care 2016)', url: 'https://doi.org/10.2337/dc16-1728' },
  nice226: { name: 'NICE NG226: osteoarthritis in over 16s', url: 'https://www.nice.org.uk/guidance/ng226' },
  nice59: { name: 'NICE NG59: low back pain and sciatica', url: 'https://www.nice.org.uk/guidance/ng59' },
  cmo: { name: 'UK Chief Medical Officers’ physical activity guidelines (2019)', url: 'https://www.gov.uk/government/publications/physical-activity-guidelines-uk-chief-medical-officers-report' },
  pregnancy: { name: 'UK CMO: physical activity in pregnancy', url: 'https://www.gov.uk/government/publications/physical-activity-in-pregnancy-infographic' },
  cyp: { name: 'Common Yoga Protocol, Ministry of AYUSH', url: 'https://www.mea.gov.in/images/pdf/common-yoga-protocol-english.pdf' },
  glaucoma: { name: 'Jasien et al., PLoS One 2015: head-down yoga poses raise eye pressure in glaucoma', url: 'https://doi.org/10.1371/journal.pone.0144505' },
  cardiac: { name: 'NHS: cardiac rehabilitation', url: 'https://www.nhs.uk/conditions/coronary-heart-disease/recovery/' },
  copd: { name: 'NHS: pulmonary rehabilitation for COPD', url: 'https://www.nhs.uk/conditions/chronic-obstructive-pulmonary-disease-copd/treatment/' },
  asthma: { name: 'NHS: asthma and exercise', url: 'https://www.nhs.uk/conditions/asthma/' },
  pain: { name: 'Pain-monitoring model (Silbernagel et al., Am J Sports Med 2007)', url: 'https://doi.org/10.1177/0363546506298279' },
  surgery: { name: 'Your own discharge advice; NHS: recovering from an operation', url: 'https://www.nhs.uk/tests-and-treatments/having-an-operation/' },
}

const HEART = /\b(coronary|angina|heart (attack|failure|disease)|myocardial|atrial fibrillation|arrhythmia|cardiomyopathy|valve)\b/
const ABDO_SURGERY = /\b(hernia|caesarean|c-section|appendectomy|appendicectomy|gallbladder|cholecystectomy|laparoscop|abdominal|bowel|stoma|hysterectomy)\b/
const HEART_SURGERY = /\b(angioplasty|stent|bypass|cabg|pacemaker|valve replacement|heart surgery)\b/

export const RULES: Rule[] = [
  {
    id: 'chest-pain', title: 'Recent chest pain or fainting',
    why: 'Chest pain, fainting or breathlessness at rest are warning signs. Get them checked before starting or stepping up exercise. If chest pain is happening now, call your emergency number.',
    source: SRC.acsm, effect: { stop: true },
    when: (f) => each(named(/\b(chest pain|chest tightness|faint|fainting|blackout|palpitations)\b/, f.symptoms), (x) => `${x.name} on ${x.date.slice(0, 10)}`),
  },
  {
    id: 'bp-very-high', title: 'Very high blood pressure reading',
    why: 'A reading of 180/120 or higher needs a doctor’s check soon. Hold off on new exercise until you have spoken to your GP; get urgent advice today if you also have a bad headache, chest pain, or blurred vision.',
    source: SRC.nice136, effect: { stop: true },
    when: (f) => (f.bp && (f.bp.systolic >= 180 || f.bp.diastolic >= 120) ? [{ because: `${f.bp.systolic}/${f.bp.diastolic} on ${f.bp.date.slice(0, 10)}` }] : []),
  },
  {
    id: 'bp-high', title: 'High blood pressure reading',
    why: 'With a reading of 160/100 or more, avoid straining, holding your breath and head-down poses until it is under control. Steady walking and light strength work are still good.',
    source: SRC.nice136, effect: { avoid: ['breath-hold', 'head-down', 'forceful-breath', 'abdominal-strain'], cap: 2 },
    when: (f) => (f.bp && f.bp.systolic < 180 && f.bp.diastolic < 120 && (f.bp.systolic >= 160 || f.bp.diastolic >= 100) ? [{ because: `${f.bp.systolic}/${f.bp.diastolic} on ${f.bp.date.slice(0, 10)}` }] : []),
  },
  {
    id: 'hypertension', title: 'High blood pressure',
    why: 'Regular aerobic exercise helps lower blood pressure. Keep breathing during every move, and skip head-down poses and forceful breathing such as Kapalabhati.',
    source: SRC.cyp, effect: { avoid: ['head-down', 'forceful-breath'], preferGroups: ['aerobic'] },
    when: (f) => each(named(/\b(hypertension|high blood pressure)\b/, f.conditions)),
  },
  {
    id: 'heart', title: 'Heart condition',
    why: 'Exercise is good for the heart, but a heart condition means checking with your team first, especially before hard exercise. Cardiac rehabilitation is the best place to start if you have been offered it. Avoid straining and holding your breath.',
    source: SRC.cardiac, effect: { avoid: ['breath-hold', 'forceful-breath', 'head-down'], cap: 2 },
    when: (f) => each(named(HEART, f.conditions)),
  },
  {
    id: 'osteoporosis', title: 'Osteoporosis',
    why: 'Strength, balance and back-strengthening exercise help bones and lower the risk of falls. Avoid bending the spine forwards a long way, repeatedly or with a load (curl-ups, toe-touches).',
    source: SRC.osteo, effect: { avoid: ['spinal-flexion'], prefer: ['back-extension'], preferGroups: ['balance', 'strength'] },
    when: (f) => each(named(/\b(osteoporosis|osteopenia)\b/, f.conditions)),
  },
  {
    id: 'vertebral-fracture', title: 'Spinal (vertebral) fracture',
    why: 'After a spinal fracture, keep impact to about brisk walking, avoid bending forwards and twisting at the end of your range, and start with back-strengthening ("straight") exercise. A physiotherapist can guide you.',
    source: SRC.osteo, effect: { avoid: ['spinal-flexion', 'impact', 'twist'], prefer: ['back-extension'] },
    when: (f) => each(named(/\b(vertebral|spinal|compression) fracture\b|\bfracture.*\b(spine|vertebra)/, [...f.conditions, ...f.procedures])),
  },
  {
    id: 'diabetes-meds', title: 'Diabetes medicine that can cause hypos',
    why: 'Insulin and some tablets (such as gliclazide) can make blood sugar fall during or after exercise. Check your sugar before exercising and carry something sugary.',
    source: SRC.ada, effect: {},
    when: (f) => each(named(/\b(insulin|gliclazide|glimepiride|glibenclamide|glipizide|tolbutamide|repaglinide)\b/, f.medicines)),
  },
  {
    id: 'retinopathy', title: 'Diabetic eye disease',
    why: 'With diabetic retinopathy, avoid hard straining, holding your breath, jarring movements and head-down poses. Ask your eye clinic how active you can be.',
    source: SRC.ada, effect: { avoid: ['breath-hold', 'impact', 'head-down', 'forceful-breath'], cap: 2 },
    when: (f) => each(named(/\bretinopathy\b/, f.conditions)),
  },
  {
    id: 'neuropathy', title: 'Nerve damage in the feet',
    why: 'Check your feet every day for cuts and blisters, and wear good shoes. Weight-bearing exercise is fine without an open foot wound; balance work helps.',
    source: SRC.ada, effect: { preferGroups: ['balance'] },
    when: (f) => each(named(/\bneuropathy\b/, f.conditions)),
  },
  {
    id: 'glaucoma', title: 'Glaucoma',
    why: 'Head-down poses raise the pressure inside the eye in people with glaucoma.',
    source: SRC.glaucoma, effect: { avoid: ['head-down'] },
    when: (f) => each(named(/\bglaucoma\b/, f.conditions)),
  },
  {
    id: 'hernia', title: 'Hernia',
    why: 'Avoid moves that push out the belly or make you strain or hold your breath.',
    source: SRC.cyp, effect: { avoid: ['abdominal-strain', 'breath-hold', 'forceful-breath'] },
    when: (f) => each(named(/\bhernia\b/, f.conditions)),
  },
  {
    id: 'pregnancy', title: 'Pregnancy',
    why: 'Keep active. Avoid lying flat on your back for long after about 16 weeks, lying face down, jumping, straining, deep twists and forceful breathing. Stop and get advice if you feel pain, bleeding or dizziness.',
    source: SRC.pregnancy, effect: { avoid: ['supine', 'prone', 'impact', 'breath-hold', 'twist', 'forceful-breath', 'abdominal-strain'] },
    when: (f) => each(named(/\bpregnan/, f.conditions)),
  },
  {
    id: 'shoulder', title: 'Shoulder problem',
    why: 'Leave out lifting above your head until your shoulder is settled.',
    source: SRC.pain, effect: { avoid: ['overhead'] },
    when: (f) => each(f.conditions.filter((c) => areasOf(`${c.name} ${c.site}`).includes('shoulder'))),
  },
  {
    id: 'wrist', title: 'Hand or wrist problem',
    why: 'Leave out moves that put your weight through your hands; wall press-ups at a gentle angle may be tolerated.',
    source: SRC.pain, effect: { avoid: ['wrist-load'] },
    when: (f) => each(f.conditions.filter((c) => areasOf(`${c.name} ${c.site}`).includes('wrist'))),
  },
  {
    id: 'knee', title: 'Knee problem',
    why: 'Exercise is a core treatment for knee osteoarthritis and most knee pain. Start with moves that keep the knee bend small, and leave out kneeling and deep bends for now.',
    source: SRC.nice226, effect: { avoid: ['kneeling', 'deep-knee', 'impact'] },
    when: (f) => each(f.conditions.filter((c) => areasOf(`${c.name} ${c.site}`).includes('knee'))),
  },
  {
    id: 'low-back', title: 'Back pain',
    why: 'Staying active and doing exercise helps back pain; group exercise and yoga are options NICE mentions. Start gently and let the pain guide you.',
    source: SRC.nice59, effect: { prefer: ['back-extension'] },
    when: (f) => each(f.conditions.filter((c) => areasOf(`${c.name} ${c.site}`).some((a) => a === 'lower-back' || a === 'upper-back'))),
  },
  {
    id: 'painful-area', title: 'Start gently where it hurts',
    why: 'For a part of the body with an active problem, the plan starts with the gentlest moves for that part. Some pain (up to 5 out of 10) is usually acceptable if it settles by the next morning and is not getting worse week on week.',
    source: SRC.pain, effect: { areaCap: 1 },
    when: (f) => f.conditions.map((c) => ({ because: c.name, record: c.record, areas: areasOf(`${c.name} ${c.site}`) })).filter((x) => x.areas.length),
  },
  {
    id: 'recent-surgery', title: 'Operation in the last 12 weeks',
    why: 'Follow the advice your surgical team gave you. Until you mark them as cleared, the plan leaves out exercises for the part that was operated on. Walking is usually encouraged early.',
    source: SRC.surgery, effect: { areaCap: 0 },
    when: (f) => f.procedures
      .filter((p) => p.date && daysBetween(p.date, f.today) >= 0 && daysBetween(p.date, f.today) <= 84)
      .map((p) => ({ because: `${p.name} on ${p.date.slice(0, 10)}`, record: p.record, areas: areasOf(`${p.name} ${p.site}`).concat(/hip replacement/i.test(p.name) ? ['hip'] : [], /knee replacement/i.test(p.name) ? ['knee'] : []) })),
  },
  {
    id: 'recent-belly-surgery', title: 'Belly or chest operation in the last 12 weeks',
    why: 'After an operation on the belly or chest, avoid straining, lifting, floor exercises and forceful breathing until your team says otherwise.',
    source: SRC.surgery, effect: { avoid: ['abdominal-strain', 'breath-hold', 'forceful-breath', 'prone', 'floor', 'overhead'], cap: 1 },
    when: (f) => each(f.procedures.filter((p) => p.date && daysBetween(p.date, f.today) >= 0 && daysBetween(p.date, f.today) <= 84 && (ABDO_SURGERY.test(p.name.toLowerCase()) || HEART_SURGERY.test(p.name.toLowerCase()) || /\b(abdomen|chest|belly)\b/i.test(p.site))), (p) => `${p.name} on ${p.date.slice(0, 10)}`),
  },
  {
    id: 'beta-blocker', title: 'Medicine that slows the heart',
    why: 'Beta blockers keep your heart rate low, so heart-rate targets do not work. Judge effort by how hard it feels (0 to 10) and the talk test.',
    source: SRC.acsm, effect: {},
    when: (f) => each(named(/\b(bisoprolol|atenolol|propranolol|metoprolol|nebivolol|carvedilol|labetalol|sotalol)\b/, f.medicines)),
  },
  {
    id: 'blood-thinner', title: 'Blood thinner',
    why: 'Blood thinners make bruising and bleeding after a fall more serious. Balance work lowers the risk of falling; hold on to something while you practise.',
    source: SRC.cmo, effect: { avoid: ['unsupported-balance'], preferGroups: ['balance'] },
    when: (f) => each(named(/\b(warfarin|apixaban|rivaroxaban|edoxaban|dabigatran)\b/, f.medicines)),
  },
  {
    id: 'asthma', title: 'Asthma',
    why: 'Keep your reliever inhaler with you, warm up gradually, and stop if you wheeze. Exercise usually helps asthma once it is well controlled.',
    source: SRC.asthma, effect: {},
    when: (f) => each(named(/\basthma\b/, f.conditions)),
  },
  {
    id: 'copd', title: 'COPD',
    why: 'Pulmonary rehabilitation is the best-proven start; ask your GP for a referral. Being breathless during exercise is expected; pace yourself.',
    source: SRC.copd, effect: { cap: 2 },
    when: (f) => each(named(/\b(copd|emphysema|chronic bronchitis)\b/, f.conditions)),
  },
  {
    id: 'epilepsy', title: 'Epilepsy',
    why: 'Most exercise is safe. Avoid exercising alone near water or at heights, and balance holds where a fall would be dangerous.',
    source: SRC.cmo, effect: { avoid: ['unsupported-balance'] },
    when: (f) => each(named(/\b(epilepsy|seizures?)\b/, f.conditions)),
  },
  {
    id: 'falls', title: 'Falls',
    why: 'Strength and balance exercise lowers the chance of another fall. Practise balance holding on to something sturdy.',
    source: SRC.cmo, effect: { avoid: ['unsupported-balance'], preferGroups: ['balance'] },
    when: (f) => each(named(/\b(falls?|fell|frailty)\b/, f.conditions)),
  },
  {
    id: 'older', title: 'Aged 65 or over',
    why: 'Guidance for older adults adds balance and strength on at least two days a week to help prevent falls.',
    source: SRC.cmo, effect: { preferGroups: ['balance'] },
    when: (f) => (f.age !== undefined && f.age >= 65 ? [{ because: `age ${f.age}` }] : []),
  },
]

export function evaluate(f: Facts): Hit[] {
  return RULES.flatMap((rule) => rule.when(f).map((m) => ({ rule, because: m.because, record: m.record, areas: m.areas ?? [] })))
}

/** Active conditions no rule knows about: the person should ask their team. */
export function unknown(f: Facts, hits: Hit[]): Fact[] {
  const seen = new Set(hits.map((h) => h.record).filter(Boolean))
  return f.conditions.filter((c) => !seen.has(c.record))
}

/** Why an exercise is left out (or capped) for this person; empty means it fits. */
export function reasons(ex: Exercise, hits: Hit[]): Hit[] {
  return hits.filter((h) => {
    const e = h.rule.effect
    if (e.stop) return false
    if (e.avoid?.some((t) => ex.tags.includes(t))) return true
    if (e.cap && ex.level > e.cap) return true
    if (e.areaCap !== undefined && h.areas.some((a) => ex.areas.includes(a)) && ex.level > e.areaCap) return true
    return false
  })
}

export const stops = (hits: Hit[]) => hits.filter((h) => h.rule.effect.stop)

/** Hits from the record that belong to a set of records (for the Body page). */
export const hitsFor = (hits: Hit[], records: Resource[]) => hits.filter((h) => h.record && records.includes(h.record))

// ---- readiness questions (built on the ACSM 2015 algorithm) ----

export const SIGNS = [
  ['chest', 'Pain, pressure or tightness in the chest, neck, jaw or arms when active'],
  ['breath', 'Short of breath at rest or with mild effort'],
  ['dizzy', 'Dizziness or fainting'],
  ['night', 'Waking up short of breath, or needing to sleep propped up'],
  ['ankles', 'Swollen ankles'],
  ['heart', 'A racing or fluttering heartbeat'],
  ['calf', 'Calf pain when walking that goes away with rest'],
  ['murmur', 'A heart murmur you have been told about'],
  ['tired', 'Unusual tiredness or breathlessness with everyday activities'],
] as const
export type Sign = (typeof SIGNS)[number][0]

export type Intensity = 'light' | 'moderate' | 'vigorous'

export interface Readiness {
  date: string
  /** Already does 30 minutes of planned moderate exercise on 3 days a week, for 3 months. */
  active: boolean
  /** Known heart, metabolic (diabetes) or kidney disease. */
  disease: boolean
  signs: Sign[]
  intensity: Intensity
  /** Date a clinician said it was fine to exercise, if any. */
  cleared?: string
}

export type Outcome = 'go' | 'start-light' | 'ask-first' | 'stop'

export interface Advice {
  outcome: Outcome
  title: string
  text: string
  /** Highest exercise level until something changes. */
  cap: 1 | 2 | 3
}

/** Known heart, metabolic or kidney disease in the record, to suggest an answer. */
export const diseaseIn = (f: Facts) =>
  named(/\b(coronary|angina|heart|myocardial|atrial fibrillation|cardiomyopathy|stroke|peripheral arter|diabetes|kidney|renal|ckd)\b/, f.conditions)

export function advise(r: Readiness): Advice {
  const cleared = !!r.cleared
  if (r.signs.length) {
    if (r.active && !cleared)
      return { outcome: 'stop', cap: 1, title: 'Pause and get checked', text: 'You exercise already and have signs that need a check. Stop exercising until a doctor has looked at these signs. If you have chest pain now, call your emergency number.' }
    if (!cleared)
      return { outcome: 'ask-first', cap: 1, title: 'Ask your doctor first', text: 'With these signs, see a doctor before you start. The plan stays at the gentlest level until you record that you have been cleared.' }
  }
  if (r.disease && !cleared) {
    if (r.active)
      return r.intensity === 'vigorous'
        ? { outcome: 'ask-first', cap: 2, title: 'Fine at moderate; ask before going harder', text: 'Carry on at moderate effort. Ask your doctor or nurse before vigorous exercise.' }
        : { outcome: 'go', cap: 2, title: 'Carry on at moderate effort', text: 'Keep going at a moderate effort. Ask your doctor or nurse before stepping up to vigorous exercise.' }
    return { outcome: 'ask-first', cap: 1, title: 'Ask your doctor first', text: 'With a heart, diabetes or kidney condition, check with your doctor or nurse before starting a new exercise plan. The plan stays at the gentlest level until you record that you have been cleared.' }
  }
  if (!r.active)
    return { outcome: 'start-light', cap: r.intensity === 'light' ? 1 : 2, title: 'Start light and build up', text: 'You can start without seeing a doctor. Begin light to moderate and build up over weeks.' }
  return { outcome: 'go', cap: 3, title: 'Carry on', text: 'You are already active with no warning signs. Carry on and build up as you like.' }
}

const QR_URL = 'urn:arogya-swasthya:questionnaire:exercise-readiness'

export function toResponse(r: Readiness, person: string): Resource {
  const items: Record<string, unknown>[] = [
    { linkId: 'active', text: 'Exercises 30 minutes at moderate effort on 3 days a week, for the last 3 months', answer: [{ valueBoolean: r.active }] },
    { linkId: 'disease', text: 'Known heart, metabolic (diabetes) or kidney disease', answer: [{ valueBoolean: r.disease }] },
    { linkId: 'signs', text: 'Signs or symptoms', answer: r.signs.map((s) => ({ valueCoding: { code: s, display: SIGNS.find(([k]) => k === s)?.[1] } })) },
    { linkId: 'intensity', text: 'Planned effort', answer: [{ valueString: r.intensity }] },
  ]
  if (r.cleared) items.push({ linkId: 'cleared', text: 'Cleared to exercise by a clinician on', answer: [{ valueDate: r.cleared }] })
  return {
    resourceType: 'QuestionnaireResponse',
    status: 'completed',
    questionnaire: QR_URL,
    subject: { reference: `Patient/${person}` },
    authored: r.date,
    item: items.map((i) => ((i.answer as unknown[]).length ? i : { linkId: i.linkId, text: i.text })),
  }
}

export const isReadiness = (r: Resource) => r.resourceType === 'QuestionnaireResponse' && r.questionnaire === QR_URL

export function fromResponse(q: Resource): Readiness {
  const items = (q.item as { linkId: string; answer?: Record<string, unknown>[] }[] | undefined) ?? []
  const a = (id: string) => items.find((i) => i.linkId === id)?.answer ?? []
  return {
    date: String(q.authored ?? ''),
    active: a('active')[0]?.valueBoolean === true,
    disease: a('disease')[0]?.valueBoolean === true,
    signs: a('signs').map((x) => (x.valueCoding as { code: Sign }).code).filter((s) => SIGNS.some(([k]) => k === s)),
    intensity: (a('intensity')[0]?.valueString as Intensity) ?? 'moderate',
    cleared: a('cleared')[0]?.valueDate as string | undefined,
  }
}
