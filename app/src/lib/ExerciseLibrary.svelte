<script lang="ts">
  // Every exercise in the library, with how to do it, where it comes from,
  // and whether it fits this person. A left-out exercise can be put back when
  // the person's own team has cleared it.
  import { Button, Card, Pill } from '@swasthya/ui'
  import { exercise, today } from './exercise.svelte.ts'
  import { EVIDENCE, EXERCISES, GROUPS, KITS, showDose, SOURCES, type Group } from './model/exercises.ts'
  import { reasons } from './model/exrules.ts'
  import { session } from './session.svelte.ts'

  let group = $state<Group | ''>('')
  let onlyFits = $state(false)
  let words = $state('')
  let open = $state<string | null>(null)
  let clearing = $state<string | null>(null)
  let note = $state('')

  const rows = $derived(
    EXERCISES.map((e) => ({ e, why: reasons(e, exercise.hits), cleared: exercise.settings?.cleared[e.id] }))
      .filter((x) => !group || x.e.group === group)
      .filter((x) => !onlyFits || !x.why.length || x.cleared)
      .filter((x) => !words.trim() || `${x.e.name} ${x.e.also ?? ''} ${x.e.muscles.join(' ')}`.toLowerCase().includes(words.trim().toLowerCase())),
  )

  async function clear(id: string) {
    const s = exercise.settings
    if (!s) return
    try {
      await exercise.savePlan({ ...s, cleared: { ...s.cleared, [id]: { date: today(), note: note.trim() } } })
      clearing = null
      note = ''
    } catch (e) {
      session.fail(e)
    }
  }
</script>

<div class="filters">
  <div class="field"><span class="label"><label for="lib-group">Kind</label></span>
    <select id="lib-group" bind:value={group}><option value="">All</option>{#each Object.entries(GROUPS) as [g, l] (g)}<option value={g}>{l}</option>{/each}</select>
  </div>
  <div class="field"><span class="label"><label for="lib-words">Find</label></span><input id="lib-words" bind:value={words} placeholder="Name or muscle" /></div>
  <label class="check"><input type="checkbox" bind:checked={onlyFits} /> Only what fits {session.personName}</label>
</div>

<Card title={`${rows.length} exercises`} explain="No gym needed: body weight, a chair, a wall, stairs, and a pair of hand weights. Steps are written for this app; each exercise names the guidance it follows. Yoga follows the Common Yoga Protocol of India's Ministry of AYUSH.">
  <ul class="lib">
    {#each rows as { e, why, cleared } (e.id)}
      <li>
        <button class="head" aria-expanded={open === e.id} onclick={() => (open = open === e.id ? null : e.id)}>
          <span class="name">{e.name}{#if e.also}<span class="muted small"> · {e.also}</span>{/if}</span>
          <span class="tags">
            {#if cleared}<Pill tone="accent">Cleared by you</Pill>{:else if why.length}<Pill tone="warn">Left out</Pill>{/if}
            <span class="muted small">{GROUPS[e.group]} · level {e.level} · {KITS[e.kit]}</span>
          </span>
        </button>
        {#if open === e.id}
          <div class="detail">
            <ol class="steps">{#each e.steps as s (s)}<li>{s}</li>{/each}</ol>
            <p class="small">Usual amount: {showDose(e.dose)}.{#if e.muscles.length}{' '}Works: {e.muscles.join(', ')}.{/if}</p>
            {#if e.safety}<p class="small warn">{e.safety}</p>{/if}
            <p class="muted small">Based on <a href={SOURCES[e.source].url} target="_blank" rel="noreferrer">{SOURCES[e.source].name}</a> · {EVIDENCE[SOURCES[e.source].evidence]}</p>
            {#if why.length}
              <div class="why">
                <p class="small"><strong>Left out because:</strong></p>
                <ul class="small">{#each why as h (h.rule.id + h.because)}<li>{h.rule.title} ({h.because}): {h.rule.why}</li>{/each}</ul>
                {#if !cleared && exercise.settings}
                  {#if clearing === e.id}
                    <div class="field"><span class="label"><label for={`n-${e.id}`}>Who cleared it (optional)</label></span><input id={`n-${e.id}`} bind:value={note} placeholder="e.g. my physiotherapist" /></div>
                    <div class="actions">
                      <Button variant="quiet" onclick={() => clear(e.id)}>Put it back in my plan</Button>
                      <Button variant="ghost" onclick={() => (clearing = null)}>Cancel</Button>
                    </div>
                  {:else}
                    <button class="link small" onclick={() => (clearing = e.id)}>My team has cleared me for this</button>
                  {/if}
                {/if}
              </div>
            {/if}
          </div>
        {/if}
      </li>
    {/each}
  </ul>
</Card>

<style>
  .filters { display: flex; flex-wrap: wrap; gap: 12px 18px; align-items: end; margin-bottom: 14px; }
  .filters .field { min-width: 180px; }
  .check { display: flex; gap: 6px; align-items: center; }
  .lib { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
  .lib > li { border-bottom: 1px solid var(--c-line); padding: 8px 0; }
  .head { all: unset; cursor: pointer; display: flex; flex-wrap: wrap; gap: 4px 10px; justify-content: space-between; width: 100%; }
  .head:focus-visible { outline: 2px solid var(--c-focus); outline-offset: 2px; }
  .name { font-weight: 600; }
  .tags { display: inline-flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .detail { margin-top: 8px; }
  .steps { margin: 0 0 6px; padding-left: 20px; display: grid; gap: 4px; }
  .warn { color: var(--c-warn); }
  .why ul { margin: 0 0 6px; padding-left: 18px; }
  .muted { color: var(--c-muted); }
  .small { font-size: var(--text-small); }
</style>
