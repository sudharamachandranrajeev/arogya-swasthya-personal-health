<script lang="ts">
  // The Exercise page: readiness and safety first, then today's session, the
  // plan, and the library. Everything is worked out on this device from the
  // person's own record.
  import { Card, Segmented } from '@swasthya/ui'
  import { exercise, today } from './exercise.svelte.ts'
  import ExerciseLibrary from './ExerciseLibrary.svelte'
  import ExercisePlan from './ExercisePlan.svelte'
  import ExerciseSafety from './ExerciseSafety.svelte'
  import ExerciseToday from './ExerciseToday.svelte'
  import { emergencyLine } from './model/places.ts'
  import { session } from './session.svelte.ts'

  type Tab = 'today' | 'plan' | 'safety' | 'library'
  let tab = $state<Tab>('today')
  const tabs: { value: Tab; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: 'plan', label: 'Plan' },
    { value: 'safety', label: 'Safety' },
    { value: 'library', label: 'Library' },
  ]

  $effect(() => {
    void session.version
    const person = session.current
    if (!person) return
    exercise.day = today()
    exercise.load(person).catch(session.fail.bind(session))
  })
</script>

{#if exercise.loaded}
  {#if exercise.stops.length}
    <Card title="Pause before exercising">
      {#each exercise.stops as h (h.rule.id + h.because)}
        <p><strong>{h.rule.title}</strong> ({h.because}). {h.rule.why}</p>
      {/each}
      <p class="sos">{emergencyLine(session.places)}</p>
    </Card>
    <div class="gap"></div>
  {/if}

  {#if !exercise.readiness}
    <p class="lead">Before a plan, a few questions about how active {session.personName} is now and any warning signs. They are built on the American College of Sports Medicine's screening steps.</p>
    <ExerciseSafety />
  {:else}
    <div class="tabs"><Segmented label="Exercise section" options={tabs} value={tab} onchange={(v) => (tab = v)} /></div>
    {#if tab === 'today'}
      <ExerciseToday />
    {:else if tab === 'plan'}
      <ExercisePlan />
    {:else if tab === 'safety'}
      <ExerciseSafety />
    {:else}
      <ExerciseLibrary />
    {/if}
  {/if}
  <p class="muted small note">Not medical advice. Exercises are adapted from the record by fixed, cited rules; they do not clear anyone to exercise. Stop if you feel chest pain, faint or very short of breath.</p>
{/if}

<style>
  .tabs { margin-bottom: 16px; overflow-x: auto; }
  .gap { height: 18px; }
  .sos { font-weight: 600; }
  .muted { color: var(--c-muted); }
  .small { font-size: var(--text-small); }
  .note { margin-top: 20px; max-width: 70ch; }
</style>
