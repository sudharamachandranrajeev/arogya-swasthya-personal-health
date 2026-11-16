<script lang="ts">
  // Readiness questions (ACSM 2015 steps, our own wording) and the rules that
  // shape the plan, each with why and where it comes from.
  import { Button, Card, Explain, Pill } from '@swasthya/ui'
  import DateField from './DateField.svelte'
  import { exercise, today } from './exercise.svelte.ts'
  import { byId } from './model/exercises.ts'
  import { advise, diseaseIn, SIGNS, type Intensity, type Readiness, type Sign } from './model/exrules.ts'
  import { session } from './session.svelte.ts'

  const prev = exercise.readiness
  const suggested = diseaseIn(exercise.facts)
  let editing = $state(!prev)
  let active = $state<'' | 'yes' | 'no'>(prev ? (prev.active ? 'yes' : 'no') : '')
  let disease = $state<'' | 'yes' | 'no'>(prev ? (prev.disease ? 'yes' : 'no') : suggested.length ? 'yes' : '')
  let signs = $state<Sign[]>(prev?.signs ?? [])
  let intensity = $state<Intensity>(prev?.intensity ?? 'moderate')
  let cleared = $state(prev?.cleared ?? '')
  let problems = $state<string[]>([])
  let busy = $state(false)

  const draft = $derived<Readiness | null>(
    active && disease ? { date: today(), active: active === 'yes', disease: disease === 'yes', signs, intensity, cleared: cleared || undefined } : null,
  )
  const preview = $derived(draft ? advise(draft) : null)
  const tone = (o: string) => (o === 'stop' ? 'danger' : o === 'ask-first' ? 'warn' : 'ok')

  function toggle(s: Sign) {
    signs = signs.includes(s) ? signs.filter((x) => x !== s) : [...signs, s]
  }

  async function save(e: SubmitEvent) {
    e.preventDefault()
    problems = []
    if (!active) problems.push('Say whether you exercise regularly now.')
    if (!disease) problems.push('Say whether you have a heart, diabetes or kidney condition.')
    if (cleared && !/^\d{4}-\d{2}-\d{2}$/.test(cleared)) problems.push('Cleared on: choose the whole date.')
    else if (cleared && cleared > today()) problems.push('The cleared date is in the future.')
    if (problems.length || !draft) return
    busy = true
    try {
      await exercise.saveReadiness(draft)
      editing = false
    } catch (err) {
      session.fail(err)
    } finally {
      busy = false
    }
  }

  const clearedList = $derived(Object.entries(exercise.settings?.cleared ?? {}))
  async function unclear(id: string) {
    const s = exercise.settings
    if (!s) return
    const { [id]: _, ...rest } = s.cleared
    await exercise.savePlan({ ...s, cleared: rest }).catch(session.fail.bind(session))
  }
</script>

<Card title="Ready to exercise?" explain="Built on the American College of Sports Medicine's 2015 screening steps: how active you are now, known heart, diabetes or kidney disease, and warning signs. The PAR-Q+ form is another well-known check you can fill in at eparmedx.com.">
  {#snippet action()}
    {#if !editing}<Button variant="quiet" onclick={() => (editing = true)}>Answer again</Button>{/if}
  {/snippet}
  {#if editing}
    <form onsubmit={save} novalidate>
      <fieldset class="q">
        <legend>Do you do at least 30 minutes of planned exercise at a moderate effort, on 3 or more days a week, and have you for the last 3 months?</legend>
        <label><input type="radio" bind:group={active} value="yes" /> Yes</label>
        <label><input type="radio" bind:group={active} value="no" /> No</label>
      </fieldset>
      <fieldset class="q">
        <legend>Do you have a heart condition, diabetes (type 1 or 2) or kidney disease?</legend>
        {#if suggested.length}<p class="muted small">Your record lists: {suggested.map((c) => c.name).join(', ')}.</p>{/if}
        <label><input type="radio" bind:group={disease} value="yes" /> Yes</label>
        <label><input type="radio" bind:group={disease} value="no" /> No</label>
      </fieldset>
      <fieldset class="q">
        <legend>Do you have any of these? Tick all that apply.</legend>
        {#each SIGNS as [key, text] (key)}
          <label class="sign"><input type="checkbox" checked={signs.includes(key)} onchange={() => toggle(key)} /> {text}</label>
        {/each}
      </fieldset>
      <fieldset class="q">
        <legend>How hard do you want to exercise? <Explain title="Effort" text="Light: you can sing. Moderate: you can talk but not sing. Vigorous: you can only say a few words before pausing for breath." /></legend>
        <label><input type="radio" bind:group={intensity} value="light" /> Light</label>
        <label><input type="radio" bind:group={intensity} value="moderate" /> Moderate</label>
        <label><input type="radio" bind:group={intensity} value="vigorous" /> Vigorous</label>
      </fieldset>
      <div class="field cleared">
        <span class="label"><label for="ex-cleared">A doctor or nurse said exercise is fine for me on (optional)</label></span>
        <DateField id="ex-cleared" bind:value={cleared} />
      </div>
      {#if preview}
        <p class="preview"><Pill tone={tone(preview.outcome)}>{preview.title}</Pill> {preview.text}</p>
      {/if}
      {#if problems.length}<ul class="problems" role="alert">{#each problems as p (p)}<li>{p}</li>{/each}</ul>{/if}
      <div class="actions">
        <Button type="submit" disabled={busy}>Save answers</Button>
        {#if prev}<Button variant="ghost" onclick={() => (editing = false)}>Cancel</Button>{/if}
      </div>
    </form>
  {:else if exercise.advice && exercise.readiness}
    <p><Pill tone={tone(exercise.advice.outcome)}>{exercise.advice.title}</Pill> {exercise.advice.text}</p>
    <p class="muted small">Answered {exercise.readiness.date.slice(0, 10)}{exercise.readiness.cleared ? ` · cleared by a clinician on ${exercise.readiness.cleared}` : ''}. Answer again if anything changes.</p>
  {/if}
</Card>

{#if exercise.readiness}
  <div class="gap"></div>
  <Card title="What the plan takes into account" explain="Rules read from the conditions, operations, medicines and recent readings in this record. Each says why, and links to its source. A rule never says you are safe to exercise; it only leaves things out or adds a note.">
    {#if exercise.hits.length}
      <ul class="hits">
        {#each exercise.hits as h (h.rule.id + h.because)}
          <li>
            <strong>{h.rule.title}</strong> <span class="muted small">from {h.because}</span>
            <p>{h.rule.why}</p>
            <a class="small" href={h.rule.source.url} target="_blank" rel="noreferrer">{h.rule.source.name}</a>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="muted">Nothing in {session.personName}'s record changes the plan.</p>
    {/if}
    {#if exercise.unknown.length}
      <p class="small"><strong>Not covered by the rules:</strong> {exercise.unknown.map((c) => c.name).join(', ')}. Ask your doctor, nurse or physiotherapist whether any exercise should be avoided.</p>
    {/if}
  </Card>

  {#if clearedList.length}
    <div class="gap"></div>
    <Card title="Put back by you" explain="Exercises a rule left out that you said your team cleared you for.">
      <ul class="hits">
        {#each clearedList as [id, c] (id)}
          <li>
            <strong>{byId.get(id)?.name ?? id}</strong> <span class="muted small">{c.date}{c.note ? ` · ${c.note}` : ''}</span>
            <button class="link small" onclick={() => unclear(id)}>Leave it out again</button>
          </li>
        {/each}
      </ul>
    </Card>
  {/if}
{/if}

<style>
  .q { border: 0; padding: 0; margin: 0 0 16px; display: grid; gap: 6px; }
  .q legend { font-weight: 600; margin-bottom: 6px; padding: 0; display: flex; gap: 6px; align-items: center; }
  .q label { display: flex; gap: 8px; align-items: flex-start; }
  .cleared { max-width: 360px; }
  .preview { margin: 14px 0 0; }
  .hits { list-style: none; margin: 0; padding: 0; display: grid; gap: 14px; }
  .hits p { margin: 4px 0; }
  .gap { height: 18px; }
  .muted { color: var(--c-muted); }
  .small { font-size: var(--text-small); }
</style>
