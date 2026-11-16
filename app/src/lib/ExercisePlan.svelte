<script lang="ts">
  // The plan: choices (days, time, goal, kit, yoga, focus), the week it makes,
  // how the week compares with the UK guidelines, and the weekly review.
  import { Button, Card, Pill } from '@swasthya/ui'
  import { exercise, today } from './exercise.svelte.ts'
  import { AYURVEDA, byId, GROUPS, showDose, type Area, type Kit } from './model/exercises.ts'
  import { apply, DAY_NAMES, defaults, GOALS, review, type Settings, type Suggestion } from './model/explan.ts'
  import { session } from './session.svelte.ts'

  const AREAS: [Area, string][] = [
    ['neck', 'Neck'], ['shoulder', 'Shoulders'], ['arm', 'Arms'], ['wrist', 'Hands and wrists'], ['upper-back', 'Upper back'],
    ['lower-back', 'Lower back'], ['core', 'Middle'], ['hip', 'Hips'], ['knee', 'Knees'], ['ankle', 'Ankles and feet'],
  ]
  const OPTIONAL: [Kit, string][] = [['weights', 'A pair of hand weights'], ['stairs', 'Stairs with a rail']]

  let draft = $state<Settings>(JSON.parse(JSON.stringify(exercise.settings ?? defaults(today()))))
  let editing = $state(!exercise.settings)
  let focusOn = $state(!!draft.focus)
  let busy = $state(false)

  const cap = $derived(exercise.advice?.cap ?? 1)
  const capped = $derived((exercise.settings?.level ?? 1) > cap)
  const t = $derived.by(() => {
    let aerobic = 0, strength = 0, balance = 0
    for (const d of exercise.week) {
      for (const it of d.items) if (it.exercise.group === 'aerobic') aerobic += it.dose.minutes ?? 0
      if (d.items.some((i) => i.exercise.group === 'strength')) strength++
      if (d.items.some((i) => i.exercise.group === 'balance' || i.exercise.group === 'yoga')) balance++
    }
    return { aerobic, strength, balance }
  })
  const suggestions = $derived(exercise.effective ? review(exercise.effective, exercise.hits, dedupe(exercise.week.flatMap((d) => d.items)), exercise.logs, exercise.day) : [])

  function dedupe<T extends { exercise: { id: string } }>(xs: T[]): T[] {
    const seen = new Set<string>()
    return xs.filter((x) => (seen.has(x.exercise.id) ? false : (seen.add(x.exercise.id), true)))
  }

  function toggleDay(d: number) {
    draft.days = draft.days.includes(d) ? draft.days.filter((x) => x !== d) : [...draft.days, d].sort()
  }
  function toggleKit(k: Kit) {
    draft.kit = draft.kit.includes(k) ? draft.kit.filter((x) => x !== k) : [...draft.kit, k]
  }

  async function save(e: SubmitEvent) {
    e.preventDefault()
    if (!draft.days.length) return
    const s: Settings = { ...draft, focus: focusOn && draft.focus?.area ? draft.focus : undefined }
    busy = true
    try {
      await exercise.savePlan(s)
      editing = false
    } catch (err) {
      session.fail(err)
    } finally {
      busy = false
    }
  }

  async function accept(sug: Suggestion) {
    if (!exercise.settings) return
    await exercise.savePlan(apply(exercise.settings, sug)).catch(session.fail.bind(session))
  }

  const name = (id: string | null | undefined) => (id ? (byId.get(id)?.name ?? id) : '')
  function label(s: Suggestion): string {
    switch (s.kind) {
      case 'step-up': return `${name(s.id)}: go up to ${showDose(s.dose)}`
      case 'harder': return `${name(s.id)}: move on to ${name(s.to)}`
      case 'step-back': return `${name(s.id)}: ${s.dose ? `ease off to ${showDose(s.dose)}` : s.to ? `switch to ${name(s.to)}` : 'leave it out for now'}`
      case 'swap': return `${name(s.id)}: ${s.to ? `replace with ${name(s.to)}` : 'leave it out (nothing similar fits)'}`
      case 'shorter': return 'Make sessions shorter'
      case 'clinician': return `${name(s.id)}: get it checked`
    }
  }
  const fmt = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
</script>

<Card title="Choices" explain="The plan is rebuilt from these choices, the readiness answers and the safety rules. Exercises change every four weeks so it does not get stale.">
  {#snippet action()}{#if !editing}<Button variant="quiet" onclick={() => (editing = true)}>Change</Button>{/if}{/snippet}
  {#if editing}
    <form onsubmit={save} novalidate>
      <fieldset class="q">
        <legend>Days</legend>
        <div class="days">{#each DAY_NAMES as d, i (d)}<label><input type="checkbox" checked={draft.days.includes(i)} onchange={() => toggleDay(i)} /> {d}</label>{/each}</div>
        {#if !draft.days.length}<p class="problems">Choose at least one day.</p>{/if}
      </fieldset>
      <div class="fields">
        <div class="field"><span class="label"><label for="ex-min">About how long</label></span>
          <select id="ex-min" bind:value={draft.minutes}><option value={10}>10 minutes</option><option value={20}>20 minutes</option><option value={30}>30 minutes</option><option value={45}>45 minutes</option></select>
        </div>
        <div class="field"><span class="label"><label for="ex-goal">Main aim</label></span>
          <select id="ex-goal" bind:value={draft.goal}>{#each GOALS as [g, l] (g)}<option value={g}>{l}</option>{/each}</select>
        </div>
        <div class="field"><span class="label"><label for="ex-level">Level</label></span>
          <select id="ex-level" bind:value={draft.level}><option value={1}>1: gentlest</option><option value={2}>2: steady</option><option value={3}>3: harder</option></select>
        </div>
      </div>
      <fieldset class="q">
        <legend>What you have (a chair, a wall and some floor are assumed)</legend>
        {#each OPTIONAL as [k, l] (k)}<label><input type="checkbox" checked={draft.kit.includes(k)} onchange={() => toggleKit(k)} /> {l}</label>{/each}
      </fieldset>
      <fieldset class="q">
        <legend>Also include</legend>
        <label><input type="checkbox" bind:checked={draft.yoga} /> Yoga and breathing (from the Common Yoga Protocol)</label>
        <label><input type="checkbox" bind:checked={draft.ayurveda} /> Ayurveda notes (traditional advice, shown separately and labelled)</label>
        <label><input type="checkbox" bind:checked={focusOn} /> Extra attention to one part of the body for a while</label>
      </fieldset>
      {#if focusOn}
        <div class="fields">
          <div class="field"><span class="label"><label for="ex-area">Part</label></span>
            <select id="ex-area" value={draft.focus?.area ?? ''} onchange={(e) => (draft.focus = { area: e.currentTarget.value as Area, until: draft.focus?.until ?? today() })}>
              <option value="" disabled>Choose…</option>{#each AREAS as [a, l] (a)}<option value={a}>{l}</option>{/each}
            </select>
          </div>
          <div class="field"><span class="label"><label for="ex-until">Until</label></span>
            <input id="ex-until" type="date" min={today()} value={draft.focus?.until ?? ''} onchange={(e) => (draft.focus = { area: draft.focus?.area ?? 'knee', until: e.currentTarget.value })} />
          </div>
        </div>
      {/if}
      <div class="actions">
        <Button type="submit" disabled={busy || !draft.days.length}>Save plan</Button>
        {#if exercise.settings}<Button variant="ghost" onclick={() => (editing = false)}>Cancel</Button>{/if}
      </div>
    </form>
  {:else if exercise.settings}
    {@const s = exercise.settings}
    <p>{GOALS.find(([g]) => g === s.goal)?.[1]} · {s.days.map((d) => DAY_NAMES[d]).join(', ')} · about {s.minutes} minutes · level {exercise.effective?.level}{s.yoga ? ' · with yoga' : ''}{s.focus && s.focus.until >= today() ? ` · focus on ${AREAS.find(([a]) => a === s.focus!.area)?.[1].toLowerCase()} until ${s.focus.until}` : ''}</p>
    {#if capped}<p class="small"><Pill tone="warn">Level held at {cap}</Pill> by the readiness answers. Answer again on the Safety tab once a clinician has cleared you.</p>{/if}
  {/if}
</Card>

{#if exercise.settings && !editing}
  <div class="gap"></div>
  <Card title="This week compared with the UK guidelines" explain="UK Chief Medical Officers (2019): 150 minutes of moderate activity a week, strength on at least 2 days, and for people 65 and over, balance and flexibility on 2 days too. Walking on other days counts.">
    <ul class="targets">
      <li><Pill tone={t.aerobic >= 150 ? 'ok' : 'accent'}>{t.aerobic} of 150 minutes</Pill> moving{t.aerobic < 150 ? ` · add about ${150 - t.aerobic} minutes of walking across the week` : ''}</li>
      <li><Pill tone={t.strength >= 2 ? 'ok' : 'warn'}>{t.strength} of 2 days</Pill> strength</li>
      {#if exercise.older}<li><Pill tone={t.balance >= 2 ? 'ok' : 'warn'}>{t.balance} of 2 days</Pill> balance</li>{/if}
    </ul>
  </Card>

  {#if suggestions.length}
    <div class="gap"></div>
    <Card title="Weekly review" explain="From the last two weeks of the log. Easy and done: a little more. Pain above 5, pain that does not settle by morning, or morning pain going up: ease off. Nothing changes until you accept.">
      <ul class="sugs">
        {#each suggestions as sug, i (i)}
          <li>
            <strong>{label(sug)}</strong>
            <p class="small">{sug.why}</p>
            {#if sug.kind !== 'clinician'}<Button variant="quiet" onclick={() => accept(sug)}>Accept</Button>{/if}
          </li>
        {/each}
      </ul>
    </Card>
  {/if}

  <div class="gap"></div>
  <Card title="The week">
    {#each exercise.week as d (d.date)}
      <h3 class:today={d.date === exercise.day}>{fmt(d.date)}{d.date === exercise.day ? ' · today' : ''}</h3>
      <ul class="plain">
        {#each d.items as it (it.exercise.id)}
          <li><span>{it.exercise.name}</span> <span class="muted small">{GROUPS[it.exercise.group]} · {showDose(it.dose)}</span></li>
        {/each}
      </ul>
    {/each}
  </Card>

  {#if exercise.settings.ayurveda}
    <div class="gap"></div>
    <Card title="Ayurveda notes" explain="Classical Ayurvedic advice on exercise (vyayama). Traditional, not tested in trials, and never used to choose or limit exercises.">
      <ul class="sugs">
        {#each AYURVEDA as a (a.id)}
          <li><strong>{a.title}</strong> <Pill tone="accent">Traditional</Pill><p>{a.text}</p><p class="muted small">{a.basis}</p></li>
        {/each}
      </ul>
    </Card>
  {/if}
{/if}

<style>
  .q { border: 0; padding: 0; margin: 0 0 14px; display: grid; gap: 6px; }
  .q legend { font-weight: 600; margin-bottom: 6px; padding: 0; }
  .q label { display: flex; gap: 8px; align-items: center; }
  .days { display: flex; flex-wrap: wrap; gap: 6px 14px; }
  .fields { margin-bottom: 14px; }
  .targets, .sugs, .plain { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
  .plain { gap: 4px; margin-bottom: 8px; }
  .sugs p { margin: 4px 0; }
  h3 { font-size: var(--text-small); color: var(--c-muted); margin: 14px 0 6px; }
  h3:first-of-type { margin-top: 0; }
  h3.today { color: var(--c-accent); }
  .gap { height: 18px; }
  .muted { color: var(--c-muted); }
  .small { font-size: var(--text-small); }
</style>
