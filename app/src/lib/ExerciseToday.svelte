<script lang="ts">
  // Today's session: each exercise with its steps, marked done (with effort
  // and pain) or skipped (with a reason). The morning after, one question
  // about pain. Saved together, so one Undo takes a session back.
  import { Button, Card, Explain, Row } from '@swasthya/ui'
  import { exercise, today } from './exercise.svelte.ts'
  import { GROUPS, showDose, SOURCES, type Dose } from './model/exercises.ts'
  import { showLog, SKIP_REASONS, type Log, type SkipReason } from './model/explan.ts'
  import { session } from './session.svelte.ts'

  type Entry = { state: '' | 'done' | 'skip'; effort: string; pain: string; amount: string; skip: SkipReason; stop: boolean; note: string }

  const day = $derived(exercise.week.find((d) => d.date === exercise.day))
  const next = $derived(exercise.week.find((d) => d.date > exercise.day))
  const loggedToday = $derived(exercise.logs.filter((l) => l.date === exercise.day))
  let entries = $state<Record<string, Entry>>({})
  let open = $state<string | null>(null)
  let busy = $state(false)
  let morning = $state('')

  const amountOf = (d: Dose) => String(d.minutes ?? d.seconds ?? d.reps ?? '')
  const unitOf = (d: Dose) => (d.minutes ? 'minutes' : d.seconds ? 'seconds each hold' : 'times each set')

  $effect(() => {
    const e: Record<string, Entry> = {}
    for (const it of day?.items ?? []) {
      const l = loggedToday.find((x) => x.id === it.exercise.id)
      e[it.exercise.id] = {
        state: l ? (l.done ? 'done' : 'skip') : '',
        effort: l?.effort !== undefined ? String(l.effort) : '',
        pain: l?.pain !== undefined ? String(l.pain) : '',
        amount: String(l?.minutes ?? l?.seconds ?? l?.reps ?? amountOf(it.dose)),
        skip: l?.skip ?? 'time',
        stop: l?.stop ?? false,
        note: l?.note ?? '',
      }
    }
    entries = e
  })

  // The last session before today with pain not yet rated the morning after.
  const lastDate = $derived(exercise.logs.filter((l) => l.date < exercise.day && l.done).map((l) => l.date).sort().at(-1))
  const unrated = $derived(lastDate ? exercise.logs.filter((l) => l.date === lastDate && l.done && l.painNext === undefined) : [])

  const n = (s: string) => (s.trim() === '' ? undefined : Number(s))
  const scale = (s: string) => { const x = n(s); return x !== undefined && Number.isInteger(x) && x >= 0 && x <= 10 }

  const problems = $derived.by(() => {
    const out: string[] = []
    for (const it of day?.items ?? []) {
      const e = entries[it.exercise.id]
      if (!e || e.state !== 'done') continue
      if (e.effort && !scale(e.effort)) out.push(`${it.exercise.name}: effort is a whole number from 0 to 10.`)
      if (e.pain && !scale(e.pain)) out.push(`${it.exercise.name}: pain is a whole number from 0 to 10.`)
      const a = n(e.amount)
      if (e.amount && (a === undefined || !Number.isFinite(a) || a <= 0 || a > 600)) out.push(`${it.exercise.name}: check the amount.`)
    }
    return out
  })
  const chosen = $derived((day?.items ?? []).filter((it) => entries[it.exercise.id]?.state))

  async function save() {
    if (problems.length || !day) return
    const logs: Log[] = chosen.map((it) => {
      const e = entries[it.exercise.id]
      const d = it.dose
      if (e.state === 'skip') return { id: it.exercise.id, date: day.date, done: false, skip: e.skip, stop: e.stop || undefined, note: e.note || undefined }
      const a = n(e.amount)
      return {
        id: it.exercise.id, date: day.date, done: true,
        sets: d.minutes ? undefined : d.sets ?? 1,
        minutes: d.minutes ? a : undefined,
        seconds: d.seconds && !d.minutes ? a : undefined,
        reps: d.reps && !d.seconds && !d.minutes ? a : undefined,
        effort: n(e.effort), pain: n(e.pain), note: e.note || undefined,
      }
    })
    busy = true
    try {
      await exercise.log(logs)
    } catch (err) {
      session.fail(err)
    } finally {
      busy = false
    }
  }

  async function rateMorning() {
    if (!scale(morning)) return
    try {
      await exercise.log(unrated.map((l) => ({ ...l, painNext: Number(morning) })))
      morning = ''
    } catch (err) {
      session.fail(err)
    }
  }

  const fmt = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
</script>

{#if unrated.length}
  <Card title="How is the pain this morning?" explain="Pain up to 5 out of 10 during exercise is usually fine if it settles by the next morning. This one number helps the weekly review ease off when it does not.">
    <p>After {fmt(lastDate!)}'s session: 0 is no pain, 10 the worst you can imagine.</p>
    <div class="inline">
      <input aria-label="Pain this morning, 0 to 10" inputmode="numeric" bind:value={morning} />
      <Button variant="quiet" disabled={!scale(morning)} onclick={rateMorning}>Save</Button>
    </div>
  </Card>
  <div class="gap"></div>
{/if}

{#if !exercise.effective}
  <Card title="No plan yet"><p>Open the Plan tab to make one.</p></Card>
{:else if exercise.stops.length}
  <p class="muted">Today's session is paused until the point above is sorted out.</p>
{:else if !day}
  <Card title="Rest day">
    <p>No session planned for {fmt(exercise.day)}. A walk still counts towards the week.</p>
    {#if next}<p class="muted">Next session: {fmt(next.date)}.</p>{/if}
  </Card>
{:else}
  <Card title="Today's session" explain="Tap an exercise to see how to do it. Mark each one done or skipped, then save. Effort is how hard it felt, 0 (resting) to 10 (the hardest you could do); aim for about 3 to 5 at first.">
    <ol class="items">
      {#each day.items as it (it.exercise.id)}
        {@const e = entries[it.exercise.id]}
        {@const ex = it.exercise}
        <li class:done={e?.state === 'done'} class:skipped={e?.state === 'skip'}>
          <button class="head" aria-expanded={open === ex.id} onclick={() => (open = open === ex.id ? null : ex.id)}>
            <span class="name">{ex.name}{#if ex.also}<span class="muted small"> · {ex.also}</span>{/if}</span>
            <span class="muted small">{GROUPS[ex.group]} · {showDose(it.dose)}</span>
          </button>
          {#if open === ex.id}
            <div class="detail">
              <ol class="steps">{#each ex.steps as s (s)}<li>{s}</li>{/each}</ol>
              {#if ex.safety}<p class="small warn">{ex.safety}</p>{/if}
              <p class="muted small">Based on: <a href={SOURCES[ex.source].url} target="_blank" rel="noreferrer">{SOURCES[ex.source].name}</a></p>
            </div>
          {/if}
          {#if e}
            <div class="mark" role="radiogroup" aria-label={`${ex.name}: done or skipped`}>
              <label><input type="radio" bind:group={e.state} value="done" /> Done</label>
              <label><input type="radio" bind:group={e.state} value="skip" /> Skipped</label>
            </div>
            {#if e.state === 'done'}
              <div class="fields">
                <div class="field"><span class="label"><label for={`a-${ex.id}`}>Amount ({unitOf(it.dose)})</label></span><input id={`a-${ex.id}`} inputmode="numeric" bind:value={e.amount} /></div>
                <div class="field"><span class="label"><label for={`e-${ex.id}`}>Effort (0 to 10)</label><Explain title="Effort" text="0 is resting, 5 is hard but steady, 10 is the hardest you could do. With heart-slowing medicines this is a better guide than heart rate." /></span><input id={`e-${ex.id}`} inputmode="numeric" bind:value={e.effort} /></div>
                <div class="field"><span class="label"><label for={`p-${ex.id}`}>Pain (0 to 10)</label></span><input id={`p-${ex.id}`} inputmode="numeric" bind:value={e.pain} /></div>
              </div>
            {:else if e.state === 'skip'}
              <div class="fields">
                <div class="field"><span class="label"><label for={`s-${ex.id}`}>Why</label></span>
                  <select id={`s-${ex.id}`} bind:value={e.skip}>{#each SKIP_REASONS as [k, t] (k)}<option value={k}>{t}</option>{/each}</select>
                </div>
                <label class="stop"><input type="checkbox" bind:checked={e.stop} /> Stop this one for good and suggest another</label>
              </div>
            {/if}
          {/if}
        </li>
      {/each}
    </ol>
    {#if problems.length}<ul class="problems" role="alert">{#each problems as p (p)}<li>{p}</li>{/each}</ul>{/if}
    <div class="actions">
      <Button disabled={busy || !chosen.length || problems.length > 0} onclick={save}>{loggedToday.length ? 'Save changes' : 'Save session'}</Button>
      <span class="muted small">{chosen.length} of {day.items.length} marked</span>
    </div>
  </Card>
{/if}

{#if exercise.logs.length}
  <div class="gap"></div>
  <Card title="Recent">
    <div class="list">
      {#each [...exercise.logRecords].slice(0, 12) as r (r.id)}
        {@const l = exercise.logs[exercise.logRecords.indexOf(r)]}
        <Row lead={l.date.slice(5)} title={String((r.code as { text?: string })?.text ?? l.id)} sub={showLog(l)} />
      {/each}
    </div>
  </Card>
{/if}

<style>
  .items { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
  .items > li { border: 1px solid var(--c-line); border-radius: var(--r-control); padding: 10px 12px; }
  .items > li.done { border-color: var(--c-ok); }
  .items > li.skipped { opacity: .75; }
  .head { all: unset; cursor: pointer; display: grid; gap: 2px; width: 100%; }
  .head:focus-visible { outline: 2px solid var(--c-focus); outline-offset: 2px; }
  .name { font-weight: 600; }
  .detail { margin: 8px 0; }
  .steps { margin: 0 0 6px; padding-left: 20px; display: grid; gap: 4px; }
  .warn { color: var(--c-warn); }
  .mark { display: flex; gap: 16px; margin-top: 8px; }
  .mark label, .stop { display: flex; gap: 6px; align-items: center; }
  .fields { margin-top: 10px; }
  .inline { display: flex; gap: 10px; align-items: center; }
  .inline input { width: 5em; font: inherit; padding: 8px; border: 1px solid var(--c-line); border-radius: var(--r-control); background: var(--c-panel); color: var(--c-ink); }
  .list { display: grid; gap: 2px; }
  .gap { height: 18px; }
  .muted { color: var(--c-muted); }
  .small { font-size: var(--text-small); }
</style>
