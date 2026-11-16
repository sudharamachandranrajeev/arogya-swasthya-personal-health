// The exercise library: no-gym moves (body weight, a chair, a wall, stairs and
// a pair of hand weights), each written for this app in plain words. Every
// item names the guidance it follows and how strong that backing is, and
// carries the tags the safety rules need (exrules.ts).
//
// Sources (wording is our own; the selection and safety notes follow them):
// - NHS Live Well exercise guides, Open Government Licence v3.0
// - US National Institute on Aging exercise guide (US federal work)
// - Common Yoga Protocol, Ministry of AYUSH / MDNIY, Government of India
// Muscle names follow free-exercise-db (Unlicense) so a larger library can be
// matched later.

export type Group = 'aerobic' | 'strength' | 'balance' | 'flexibility' | 'yoga' | 'breathing'
export type Kit = 'none' | 'chair' | 'wall' | 'stairs' | 'weights'
/** Parts of the body an exercise puts load or stretch through. */
export type Area = 'neck' | 'shoulder' | 'arm' | 'wrist' | 'upper-back' | 'lower-back' | 'core' | 'hip' | 'knee' | 'ankle'
/** What a safety rule can leave out. */
export type Tag =
  | 'spinal-flexion' // loaded, repeated or end-range forward bending of the spine
  | 'twist' // spinal rotation, especially at end range
  | 'impact' // both feet leave the floor or land hard
  | 'overhead' // arms raised above the head under load
  | 'floor' // getting down to and up from the floor
  | 'kneeling' // weight on the knees
  | 'deep-knee' // knee bent past about 90 degrees under load
  | 'deep-hip' // hip bent past 90 degrees, or crossing the midline
  | 'breath-hold' // straining or long holds where people tend to hold their breath
  | 'head-down' // head below the heart
  | 'supine' // lying on the back
  | 'prone' // lying face down
  | 'wrist-load' // weight through the hands
  | 'abdominal-strain' // raises pressure in the belly
  | 'unsupported-balance' // standing balance without something to hold
  | 'back-extension' // strengthens the muscles along the spine
  | 'forceful-breath' // rapid or forceful breathing

export type Evidence = 'guideline' | 'trial' | 'traditional'

export interface Source {
  name: string
  url: string
  licence: string
  evidence: Evidence
}

export const SOURCES = {
  'nhs-strength': { name: 'NHS: strength exercises', url: 'https://www.nhs.uk/live-well/exercise/strength-exercises/', licence: 'Open Government Licence v3.0', evidence: 'guideline' },
  'nhs-balance': { name: 'NHS: balance exercises', url: 'https://www.nhs.uk/live-well/exercise/balance-exercises/', licence: 'Open Government Licence v3.0', evidence: 'guideline' },
  'nhs-flex': { name: 'NHS: flexibility exercises', url: 'https://www.nhs.uk/live-well/exercise/flexibility-exercises/', licence: 'Open Government Licence v3.0', evidence: 'guideline' },
  'nhs-sitting': { name: 'NHS: sitting exercises', url: 'https://www.nhs.uk/live-well/exercise/sitting-exercises/', licence: 'Open Government Licence v3.0', evidence: 'guideline' },
  'nhs-walking': { name: 'NHS: walking for health', url: 'https://www.nhs.uk/live-well/exercise/running-and-aerobic-exercises/walking-for-health/', licence: 'Open Government Licence v3.0', evidence: 'guideline' },
  'nhs-strength-flex': { name: 'NHS: how to improve strength and flexibility', url: 'https://www.nhs.uk/live-well/exercise/how-to-improve-strength-flexibility/', licence: 'Open Government Licence v3.0', evidence: 'guideline' },
  nia: { name: 'National Institute on Aging: exercise and physical activity', url: 'https://www.nia.nih.gov/health/exercise-and-physical-activity', licence: 'US federal work', evidence: 'guideline' },
  cmo: { name: 'UK Chief Medical Officers’ physical activity guidelines (2019)', url: 'https://www.gov.uk/government/publications/physical-activity-guidelines-uk-chief-medical-officers-report', licence: 'Open Government Licence v3.0', evidence: 'guideline' },
  osteo: { name: 'Strong, Steady and Straight: UK consensus on exercise for osteoporosis (BJSM 2022)', url: 'https://bjsm.bmj.com/content/56/15/837', licence: 'cited', evidence: 'guideline' },
  cyp: { name: 'Common Yoga Protocol, Ministry of AYUSH (Government of India)', url: 'https://www.mea.gov.in/images/pdf/common-yoga-protocol-english.pdf', licence: 'cited; wording our own', evidence: 'traditional' },
} satisfies Record<string, Source>
export type SourceKey = keyof typeof SOURCES

export interface Dose {
  sets?: number
  reps?: number
  /** Hold time for one go, in seconds. */
  seconds?: number
  minutes?: number
  /** Reps or hold are for each side. */
  perSide?: boolean
}

export interface Exercise {
  id: string
  name: string
  /** Another name people know it by, such as the Sanskrit name. */
  also?: string
  group: Group
  /** 1 = gentlest start, 3 = hardest in this library. */
  level: 1 | 2 | 3
  kit: Kit
  areas: Area[]
  muscles: string[]
  tags: Tag[]
  dose: Dose
  steps: string[]
  /** Shown with the steps. */
  safety?: string
  easier?: string
  harder?: string
  source: SourceKey
}

const STOP = 'Stop if you feel chest pain, dizziness or sudden shortness of breath.'

export const EXERCISES: Exercise[] = [
  // ---- aerobic ----
  {
    id: 'walk', name: 'Walking', group: 'aerobic', level: 1, kit: 'none', areas: ['hip', 'knee', 'ankle'], muscles: ['quadriceps', 'hamstrings', 'calves'], tags: [],
    dose: { minutes: 10 }, source: 'nhs-walking', harder: 'brisk-walk',
    steps: ['Walk at a pace that feels comfortable.', 'Stand tall and let your arms swing.', 'Build up the time a few minutes each week.'],
  },
  {
    id: 'brisk-walk', name: 'Brisk walking', group: 'aerobic', level: 2, kit: 'none', areas: ['hip', 'knee', 'ankle'], muscles: ['quadriceps', 'hamstrings', 'calves'], tags: [],
    dose: { minutes: 10 }, source: 'nhs-walking', easier: 'walk', harder: 'walk-intervals',
    steps: ['Walk fast enough that you can talk but not sing.', 'Keep your shoulders relaxed and swing your arms.', 'Slow down for the last two minutes.'],
  },
  {
    id: 'walk-intervals', name: 'Walking with faster spells', group: 'aerobic', level: 3, kit: 'none', areas: ['hip', 'knee', 'ankle'], muscles: ['quadriceps', 'hamstrings', 'calves'], tags: [],
    dose: { minutes: 15 }, source: 'nhs-walking', easier: 'brisk-walk',
    steps: ['Walk briskly for 3 minutes.', 'Then walk as fast as you can for 1 minute, hard enough that talking is difficult.', 'Repeat, and finish with 3 easy minutes.'],
  },
  {
    id: 'seated-march', name: 'Seated marching', group: 'aerobic', level: 1, kit: 'chair', areas: ['hip'], muscles: ['quadriceps', 'abdominals'], tags: [],
    dose: { minutes: 5 }, source: 'nhs-sitting', harder: 'march',
    steps: ['Sit upright on a firm chair without leaning back.', 'Lift one knee, then the other, as if marching.', 'Swing your arms to raise your heart rate.'],
  },
  {
    id: 'march', name: 'Marching on the spot', group: 'aerobic', level: 1, kit: 'none', areas: ['hip', 'knee', 'ankle'], muscles: ['quadriceps', 'calves'], tags: [],
    dose: { minutes: 5 }, source: 'nia', easier: 'seated-march', harder: 'stairs',
    steps: ['Stand near a wall or chair you can touch.', 'March on the spot, lifting your knees as high as is comfortable.', 'Swing your arms. Keep going steadily.'],
  },
  {
    id: 'stairs', name: 'Stair climbing', group: 'aerobic', level: 2, kit: 'stairs', areas: ['hip', 'knee', 'ankle'], muscles: ['quadriceps', 'glutes', 'calves'], tags: [],
    dose: { minutes: 5 }, source: 'nia', easier: 'march',
    steps: ['Walk up a flight of stairs holding the rail.', 'Walk down slowly, still holding the rail.', 'Rest at the bottom if you need to, then go again.'],
  },
  {
    id: 'dance', name: 'Dancing to music', group: 'aerobic', level: 2, kit: 'none', areas: ['hip', 'knee', 'ankle'], muscles: ['quadriceps', 'calves'], tags: [],
    dose: { minutes: 10 }, source: 'cmo',
    steps: ['Put on music you like.', 'Move to it: step side to side, swing your arms, turn gently.', 'Keep moving for the whole song, then the next.'],
  },

  // ---- strength: legs ----
  {
    id: 'sit-to-stand', name: 'Sit to stand', group: 'strength', level: 1, kit: 'chair', areas: ['hip', 'knee'], muscles: ['quadriceps', 'glutes'], tags: [],
    dose: { sets: 2, reps: 8 }, source: 'nhs-strength', harder: 'squat-to-chair',
    steps: ['Sit near the front of a firm chair, feet flat and hip-width apart.', 'Lean forward a little and stand up, using your hands on your thighs if you need to.', 'Sit back down slowly and with control.'],
  },
  {
    id: 'squat-to-chair', name: 'Squat to a chair', group: 'strength', level: 2, kit: 'chair', areas: ['hip', 'knee'], muscles: ['quadriceps', 'glutes', 'hamstrings'], tags: [],
    dose: { sets: 2, reps: 10 }, source: 'nhs-strength', easier: 'sit-to-stand', harder: 'squat',
    steps: ['Stand in front of a chair, feet hip-width apart, arms out in front.', 'Bend your knees and push your bottom back until it just touches the seat.', 'Stand straight back up without sitting down.'],
  },
  {
    id: 'squat', name: 'Squat', group: 'strength', level: 3, kit: 'none', areas: ['hip', 'knee'], muscles: ['quadriceps', 'glutes', 'hamstrings'], tags: ['deep-knee'],
    dose: { sets: 2, reps: 12 }, source: 'nhs-strength', easier: 'squat-to-chair',
    steps: ['Stand with feet a little wider than your hips.', 'Bend your knees and hips as if sitting back, keeping your chest up and heels down.', 'Go as low as feels comfortable, then stand up.'],
  },
  {
    id: 'wall-sit', name: 'Wall sit', group: 'strength', level: 2, kit: 'wall', areas: ['knee', 'hip'], muscles: ['quadriceps'], tags: ['breath-hold'],
    dose: { sets: 2, seconds: 20 }, source: 'nhs-strength',
    steps: ['Stand with your back flat against a wall, feet a step away from it.', 'Slide down until your knees are bent to a comfortable angle (not past 90 degrees).', 'Hold, breathing normally, then slide back up.'],
    safety: 'Keep breathing; do not hold your breath.',
  },
  {
    id: 'calf-raise', name: 'Calf raises', group: 'strength', level: 1, kit: 'chair', areas: ['ankle'], muscles: ['calves'], tags: [],
    dose: { sets: 2, reps: 10 }, source: 'nhs-balance', harder: 'calf-raise-single',
    steps: ['Stand behind a chair holding the back of it.', 'Rise up onto your toes.', 'Lower your heels slowly to the floor.'],
  },
  {
    id: 'calf-raise-single', name: 'Single-leg calf raises', group: 'strength', level: 3, kit: 'chair', areas: ['ankle'], muscles: ['calves'], tags: [],
    dose: { sets: 2, reps: 8, perSide: true }, source: 'nhs-strength', easier: 'calf-raise',
    steps: ['Hold the back of a chair and stand on one foot.', 'Rise up onto your toes, then lower slowly.', 'Change legs.'],
  },
  {
    id: 'seated-knee-extension', name: 'Seated knee straightening', group: 'strength', level: 1, kit: 'chair', areas: ['knee'], muscles: ['quadriceps'], tags: [],
    dose: { sets: 2, reps: 10, perSide: true }, source: 'nhs-sitting', harder: 'sit-to-stand',
    steps: ['Sit upright on a chair.', 'Straighten one knee until the leg is out in front of you, and hold for a moment.', 'Lower it slowly. Change legs.'],
  },
  {
    id: 'standing-knee-bend', name: 'Standing knee bend', group: 'strength', level: 1, kit: 'chair', areas: ['knee'], muscles: ['hamstrings'], tags: [],
    dose: { sets: 2, reps: 10, perSide: true }, source: 'nia',
    steps: ['Hold the back of a chair.', 'Bend one knee, bringing your heel up towards your bottom.', 'Lower it slowly. Change legs.'],
  },
  {
    id: 'side-leg-raise', name: 'Side leg raise', group: 'strength', level: 1, kit: 'chair', areas: ['hip'], muscles: ['abductors', 'glutes'], tags: [],
    dose: { sets: 2, reps: 10, perSide: true }, source: 'nhs-strength',
    steps: ['Stand side-on to a chair and hold it.', 'Lift your outside leg out to the side, keeping your back straight and toes forward.', 'Lower it slowly. Change sides.'],
  },
  {
    id: 'hip-extension', name: 'Standing leg back', group: 'strength', level: 1, kit: 'chair', areas: ['hip', 'lower-back'], muscles: ['glutes', 'hamstrings'], tags: [],
    dose: { sets: 2, reps: 10, perSide: true }, source: 'nia',
    steps: ['Hold the back of a chair, leaning forward slightly from the hips.', 'Lift one straight leg backwards without arching your back.', 'Lower it slowly. Change legs.'],
  },
  {
    id: 'step-up', name: 'Step-ups', group: 'strength', level: 2, kit: 'stairs', areas: ['hip', 'knee', 'ankle'], muscles: ['quadriceps', 'glutes'], tags: [],
    dose: { sets: 2, reps: 10, perSide: true }, source: 'nhs-strength', easier: 'sit-to-stand', harder: 'reverse-lunge',
    steps: ['Stand facing the bottom stair, holding the rail.', 'Step up with one foot, then bring the other foot up.', 'Step down with the same foot first. Change the leading leg halfway.'],
  },
  {
    id: 'reverse-lunge', name: 'Backward lunge', group: 'strength', level: 3, kit: 'chair', areas: ['hip', 'knee'], muscles: ['quadriceps', 'glutes', 'hamstrings'], tags: ['deep-knee'],
    dose: { sets: 2, reps: 8, perSide: true }, source: 'nhs-strength', easier: 'step-up',
    steps: ['Stand beside a chair and hold it lightly.', 'Step one foot back and bend both knees, keeping your front knee over your ankle.', 'Push through the front heel to come back up. Change legs.'],
  },
  {
    id: 'glute-bridge', name: 'Bridge', group: 'strength', level: 2, kit: 'none', areas: ['hip', 'lower-back'], muscles: ['glutes', 'hamstrings'], tags: ['floor', 'supine'],
    dose: { sets: 2, reps: 10 }, source: 'nhs-strength',
    steps: ['Lie on your back with knees bent and feet flat on the floor.', 'Squeeze your bottom and lift your hips until your body is in a line from shoulders to knees.', 'Lower slowly.'],
  },

  // ---- strength: arms, chest, back ----
  {
    id: 'wall-press-up', name: 'Wall press-up', group: 'strength', level: 1, kit: 'wall', areas: ['shoulder', 'arm', 'wrist'], muscles: ['chest', 'triceps', 'shoulders'], tags: ['wrist-load'],
    dose: { sets: 2, reps: 10 }, source: 'nhs-strength', harder: 'counter-press-up',
    steps: ['Stand an arm’s length from a wall and put your hands flat on it at shoulder height.', 'Bend your elbows to bring your chest towards the wall, keeping your body straight.', 'Push back to the start.'],
  },
  {
    id: 'counter-press-up', name: 'Press-up on a worktop', group: 'strength', level: 2, kit: 'none', areas: ['shoulder', 'arm', 'wrist'], muscles: ['chest', 'triceps', 'shoulders'], tags: ['wrist-load'],
    dose: { sets: 2, reps: 10 }, source: 'nhs-strength', easier: 'wall-press-up', harder: 'knee-press-up',
    steps: ['Put your hands on the edge of a sturdy kitchen worktop or table, shoulder-width apart.', 'Walk your feet back until your body is straight and leaning.', 'Lower your chest to the edge, then push back up.'],
  },
  {
    id: 'knee-press-up', name: 'Press-up on knees', group: 'strength', level: 3, kit: 'none', areas: ['shoulder', 'arm', 'wrist', 'core'], muscles: ['chest', 'triceps', 'shoulders'], tags: ['wrist-load', 'floor', 'kneeling'],
    dose: { sets: 2, reps: 8 }, source: 'nhs-strength', easier: 'counter-press-up',
    steps: ['Kneel on a mat with your hands under your shoulders.', 'Keep a straight line from head to knees.', 'Bend your elbows to lower your chest, then push back up.'],
  },
  {
    id: 'bicep-curl', name: 'Arm curl with hand weights', group: 'strength', level: 1, kit: 'weights', areas: ['arm'], muscles: ['biceps'], tags: [],
    dose: { sets: 2, reps: 10 }, source: 'nhs-strength',
    steps: ['Sit or stand with a weight in each hand, arms by your sides, palms forward.', 'Bend your elbows to bring the weights up to your shoulders.', 'Lower slowly. Tins of food work if you have no weights.'],
  },
  {
    id: 'seated-arm-raise', name: 'Seated arm raise', group: 'strength', level: 1, kit: 'chair', areas: ['shoulder'], muscles: ['shoulders'], tags: [],
    dose: { sets: 2, reps: 10 }, source: 'nhs-sitting', harder: 'lateral-raise',
    steps: ['Sit upright with your arms by your sides.', 'Raise both arms out to the side to shoulder height, palms down.', 'Lower slowly.'],
  },
  {
    id: 'lateral-raise', name: 'Side raise with hand weights', group: 'strength', level: 2, kit: 'weights', areas: ['shoulder'], muscles: ['shoulders'], tags: [],
    dose: { sets: 2, reps: 10 }, source: 'nia', easier: 'seated-arm-raise', harder: 'overhead-press',
    steps: ['Stand or sit with a light weight in each hand.', 'Raise your arms out to the side to shoulder height, elbows slightly bent.', 'Lower slowly.'],
  },
  {
    id: 'overhead-press', name: 'Overhead press with hand weights', group: 'strength', level: 3, kit: 'weights', areas: ['shoulder', 'arm', 'upper-back'], muscles: ['shoulders', 'triceps'], tags: ['overhead'],
    dose: { sets: 2, reps: 8 }, source: 'nia', easier: 'lateral-raise',
    steps: ['Sit upright holding a weight in each hand at shoulder height, palms forward.', 'Push the weights up above your head without locking your elbows.', 'Lower slowly to your shoulders.'],
  },
  {
    id: 'one-arm-row', name: 'One-arm row with a hand weight', group: 'strength', level: 2, kit: 'weights', areas: ['upper-back', 'arm', 'shoulder'], muscles: ['lats', 'middle back', 'biceps'], tags: [],
    dose: { sets: 2, reps: 10, perSide: true }, source: 'nia',
    steps: ['Put one hand on the back of a chair and step back so you lean forward with a flat back.', 'Hold a weight in the other hand, arm hanging down.', 'Pull the weight up to your ribs, then lower slowly. Change sides.'],
  },
  {
    id: 'triceps-extension', name: 'Back of arm with a hand weight', group: 'strength', level: 2, kit: 'weights', areas: ['arm', 'shoulder'], muscles: ['triceps'], tags: [],
    dose: { sets: 2, reps: 10, perSide: true }, source: 'nia',
    steps: ['Lean on a chair with one hand, holding a weight in the other with your elbow bent at your side.', 'Straighten your arm backwards.', 'Bend it back slowly. Change sides.'],
  },
  {
    id: 'shoulder-squeeze', name: 'Shoulder blade squeeze', group: 'strength', level: 1, kit: 'chair', areas: ['upper-back'], muscles: ['middle back', 'traps'], tags: [],
    dose: { sets: 2, reps: 10 }, source: 'osteo',
    steps: ['Sit upright away from the chair back.', 'Draw your shoulder blades back and together, keeping your shoulders down.', 'Hold for 3 seconds and relax.'],
  },

  // ---- strength: back and middle ----
  {
    id: 'prone-lift', name: 'Face-down back lift', group: 'strength', level: 2, kit: 'none', areas: ['lower-back', 'upper-back'], muscles: ['lower back', 'middle back'], tags: ['floor', 'prone', 'back-extension'],
    dose: { sets: 2, reps: 8 }, source: 'osteo',
    steps: ['Lie face down with a pillow under your hips and your arms by your sides.', 'Lift your head and shoulders a little off the floor, looking at the floor.', 'Hold for 3 seconds and lower.'],
  },
  {
    id: 'standing-back-extension', name: 'Standing tall back strengthener', group: 'strength', level: 1, kit: 'wall', areas: ['upper-back'], muscles: ['middle back', 'lower back'], tags: ['back-extension'],
    dose: { sets: 2, reps: 8 }, source: 'osteo', harder: 'prone-lift',
    steps: ['Stand with your back against a wall, heels a little away from it.', 'Press the back of your head and shoulders gently towards the wall, growing tall.', 'Hold for 5 seconds and relax.'],
  },
  {
    id: 'bird-dog', name: 'Arm and leg reach on all fours', group: 'strength', level: 2, kit: 'none', areas: ['lower-back', 'core', 'wrist'], muscles: ['lower back', 'glutes', 'abdominals'], tags: ['floor', 'kneeling', 'wrist-load', 'back-extension'],
    dose: { sets: 2, reps: 6, perSide: true }, source: 'nhs-strength',
    steps: ['Kneel on all fours, hands under shoulders and knees under hips.', 'Reach one arm forward and the opposite leg back, keeping your back flat.', 'Hold for 3 seconds, return, and change sides.'],
  },
  {
    id: 'dead-bug', name: 'Dead bug', group: 'strength', level: 2, kit: 'none', areas: ['core'], muscles: ['abdominals'], tags: ['floor', 'supine'],
    dose: { sets: 2, reps: 6, perSide: true }, source: 'nhs-strength',
    steps: ['Lie on your back with arms pointing to the ceiling and knees bent above your hips.', 'Slowly lower one arm behind you and the opposite leg towards the floor, keeping your lower back down.', 'Return and change sides.'],
  },
  {
    id: 'knee-plank', name: 'Plank on knees', group: 'strength', level: 2, kit: 'none', areas: ['core', 'shoulder'], muscles: ['abdominals', 'shoulders'], tags: ['floor', 'kneeling', 'breath-hold', 'abdominal-strain'],
    dose: { sets: 2, seconds: 15 }, source: 'nhs-strength', harder: 'plank',
    steps: ['Lie face down, then rise onto your forearms and knees.', 'Keep a straight line from head to knees.', 'Hold, breathing normally, then lower.'],
    safety: 'Keep breathing; do not hold your breath.',
  },
  {
    id: 'plank', name: 'Plank', group: 'strength', level: 3, kit: 'none', areas: ['core', 'shoulder'], muscles: ['abdominals', 'shoulders'], tags: ['floor', 'breath-hold', 'abdominal-strain'],
    dose: { sets: 2, seconds: 20 }, source: 'nhs-strength', easier: 'knee-plank',
    steps: ['Rest on your forearms and toes, elbows under your shoulders.', 'Keep a straight line from head to heels.', 'Hold, breathing normally, then lower.'],
    safety: 'Keep breathing; do not hold your breath.',
  },
  {
    id: 'curl-up', name: 'Curl-up', group: 'strength', level: 2, kit: 'none', areas: ['core', 'neck'], muscles: ['abdominals'], tags: ['floor', 'supine', 'spinal-flexion', 'abdominal-strain'],
    dose: { sets: 2, reps: 8 }, source: 'nhs-strength',
    steps: ['Lie on your back, knees bent, hands on your thighs.', 'Curl your head and shoulders up, sliding your hands towards your knees.', 'Lower slowly.'],
  },

  // ---- balance ----
  {
    id: 'tandem-stand', name: 'Heel-to-toe stand', group: 'balance', level: 1, kit: 'chair', areas: ['ankle'], muscles: ['calves'], tags: [],
    dose: { sets: 2, seconds: 10 }, source: 'nhs-balance', harder: 'heel-toe-walk',
    steps: ['Stand next to a chair and hold it.', 'Put one foot directly in front of the other, heel touching toe.', 'Hold, then let go of the chair if you feel steady. Change feet.'],
  },
  {
    id: 'one-leg-supported', name: 'One-leg stand, holding on', group: 'balance', level: 1, kit: 'chair', areas: ['hip', 'ankle'], muscles: ['glutes', 'calves'], tags: [],
    dose: { sets: 2, seconds: 10, perSide: true }, source: 'nhs-balance', harder: 'one-leg-stand',
    steps: ['Stand behind a chair holding it with both hands.', 'Lift one foot off the floor and hold.', 'Change legs.'],
  },
  {
    id: 'one-leg-stand', name: 'One-leg stand', group: 'balance', level: 2, kit: 'chair', areas: ['hip', 'ankle'], muscles: ['glutes', 'calves'], tags: ['unsupported-balance'],
    dose: { sets: 2, seconds: 15, perSide: true }, source: 'nhs-balance', easier: 'one-leg-supported',
    steps: ['Stand next to a chair with one hand just above it, not holding.', 'Lift one foot and hold, using the chair only if you need it.', 'Change legs.'],
  },
  {
    id: 'heel-toe-walk', name: 'Heel-to-toe walk', group: 'balance', level: 2, kit: 'wall', areas: ['ankle', 'hip'], muscles: ['calves'], tags: ['unsupported-balance'],
    dose: { sets: 2, reps: 10 }, source: 'nhs-balance', easier: 'tandem-stand',
    steps: ['Stand beside a wall or worktop you can touch.', 'Walk forwards placing each heel right in front of the other foot’s toes.', 'Look ahead, not down. Take 10 steps.'],
  },
  {
    id: 'side-walk', name: 'Sideways walking', group: 'balance', level: 1, kit: 'wall', areas: ['hip'], muscles: ['abductors', 'adductors'], tags: [],
    dose: { sets: 2, reps: 10 }, source: 'nia',
    steps: ['Stand beside a wall or along a worktop.', 'Step sideways, bringing the other foot to meet it.', 'Take 10 steps one way, then 10 back.'],
  },
  {
    id: 'heel-toe-raise', name: 'Heel and toe rocks', group: 'balance', level: 1, kit: 'chair', areas: ['ankle'], muscles: ['calves'], tags: [],
    dose: { sets: 2, reps: 10 }, source: 'nhs-balance',
    steps: ['Hold the back of a chair.', 'Rise onto your toes, then rock back onto your heels, lifting your toes.', 'Move slowly and smoothly.'],
  },
  {
    id: 'clock-reach', name: 'Clock reach', group: 'balance', level: 3, kit: 'chair', areas: ['hip', 'shoulder', 'ankle'], muscles: ['glutes', 'shoulders'], tags: ['unsupported-balance'],
    dose: { sets: 1, reps: 3, perSide: true }, source: 'nia', easier: 'one-leg-stand',
    steps: ['Hold a chair with your left hand and stand on your left leg.', 'Point your right arm to 12 o’clock, then 3, then 6, as if on a clock face.', 'Return to the start. Change sides.'],
  },

  // ---- flexibility ----
  {
    id: 'neck-turn', name: 'Neck turns', group: 'flexibility', level: 1, kit: 'chair', areas: ['neck'], muscles: ['neck'], tags: [],
    dose: { reps: 5, perSide: true }, source: 'nhs-sitting',
    steps: ['Sit upright with shoulders down.', 'Turn your head slowly to look over one shoulder, as far as is comfortable.', 'Hold for 5 seconds and turn to the other side.'],
  },
  {
    id: 'shoulder-roll', name: 'Shoulder rolls', group: 'flexibility', level: 1, kit: 'none', areas: ['shoulder', 'upper-back'], muscles: ['shoulders', 'traps'], tags: [],
    dose: { reps: 10 }, source: 'nhs-sitting',
    steps: ['Sit or stand tall with your arms relaxed.', 'Lift your shoulders up, roll them back, then down.', 'Make the circles slow and smooth.'],
  },
  {
    id: 'chest-stretch', name: 'Chest stretch', group: 'flexibility', level: 1, kit: 'none', areas: ['shoulder'], muscles: ['chest', 'shoulders'], tags: [],
    dose: { reps: 3, seconds: 20 }, source: 'nhs-flex',
    steps: ['Stand or sit tall and clasp your hands behind your back (or hold the sides of the chair).', 'Draw your shoulders back and gently lift your chest.', 'Hold, breathing slowly.'],
  },
  {
    id: 'calf-stretch', name: 'Calf stretch', group: 'flexibility', level: 1, kit: 'wall', areas: ['ankle'], muscles: ['calves'], tags: [],
    dose: { reps: 2, seconds: 20, perSide: true }, source: 'nhs-flex',
    steps: ['Stand facing a wall with your hands on it.', 'Step one foot back, keeping that heel down and leg straight, and bend the front knee.', 'Hold, then change legs.'],
  },
  {
    id: 'hamstring-stretch', name: 'Seated back-of-thigh stretch', group: 'flexibility', level: 1, kit: 'chair', areas: ['knee', 'hip'], muscles: ['hamstrings'], tags: [],
    dose: { reps: 2, seconds: 20, perSide: true }, source: 'nhs-sitting',
    steps: ['Sit near the front of a chair and straighten one leg, heel on the floor.', 'Sit tall and lean forward from the hips, keeping your back straight, until you feel a stretch.', 'Hold, then change legs.'],
  },
  {
    id: 'quad-stretch', name: 'Front-of-thigh stretch', group: 'flexibility', level: 2, kit: 'chair', areas: ['knee', 'hip'], muscles: ['quadriceps'], tags: ['deep-knee'],
    dose: { reps: 2, seconds: 20, perSide: true }, source: 'nhs-flex',
    steps: ['Hold a chair with one hand.', 'Bend the other knee and hold your ankle (or your trouser leg) behind you.', 'Keep your knees together and hold. Change legs.'],
  },
  {
    id: 'hip-flexor-stretch', name: 'Standing hip stretch', group: 'flexibility', level: 1, kit: 'chair', areas: ['hip'], muscles: ['quadriceps'], tags: [],
    dose: { reps: 2, seconds: 20, perSide: true }, source: 'nhs-flex',
    steps: ['Hold a chair and take a long step forward with one foot.', 'Bend the front knee and tuck your bottom under until you feel a stretch at the front of the back hip.', 'Hold, then change legs.'],
  },
  {
    id: 'seated-twist', name: 'Seated upper-body twist', group: 'flexibility', level: 1, kit: 'chair', areas: ['upper-back', 'lower-back'], muscles: ['middle back', 'abdominals'], tags: ['twist'],
    dose: { reps: 3, seconds: 10, perSide: true }, source: 'nhs-sitting',
    steps: ['Sit upright with your feet flat.', 'Turn your upper body to one side, holding the chair back, as far as is comfortable.', 'Hold, return to the middle, and turn the other way.'],
  },
  {
    id: 'ankle-circle', name: 'Ankle circles', group: 'flexibility', level: 1, kit: 'chair', areas: ['ankle'], muscles: ['calves'], tags: [],
    dose: { reps: 5, perSide: true }, source: 'nhs-sitting',
    steps: ['Sit upright and lift one foot a little off the floor.', 'Draw slow circles with your toes, 5 one way and 5 the other.', 'Change feet.'],
  },

  // ---- yoga (Common Yoga Protocol practices; steps in our own words) ----
  {
    id: 'tadasana', name: 'Palm tree pose', also: 'Tadasana', group: 'yoga', level: 1, kit: 'none', areas: ['shoulder', 'ankle'], muscles: ['calves', 'shoulders'], tags: ['overhead'],
    dose: { reps: 3, seconds: 10 }, source: 'cyp',
    steps: ['Stand with feet a little apart.', 'Breathing in, raise your arms above your head with fingers interlocked and rise onto your toes.', 'Hold, then breathe out as you lower arms and heels.'],
  },
  {
    id: 'vrikshasana', name: 'Tree pose', also: 'Vrikshasana', group: 'yoga', level: 2, kit: 'wall', areas: ['hip', 'ankle'], muscles: ['glutes', 'calves'], tags: ['unsupported-balance'],
    dose: { reps: 2, seconds: 15, perSide: true }, source: 'cyp',
    steps: ['Stand beside a wall you can touch.', 'Place the sole of one foot on the inside of the other ankle, calf or thigh (never on the knee).', 'Bring palms together at the chest and hold. Change legs.'],
  },
  {
    id: 'pada-hastasana', name: 'Hands-to-feet forward bend', also: 'Pada-hastasana', group: 'yoga', level: 2, kit: 'none', areas: ['lower-back', 'hip'], muscles: ['hamstrings', 'lower back'], tags: ['spinal-flexion', 'head-down'],
    dose: { reps: 2, seconds: 10 }, source: 'cyp',
    steps: ['Stand with feet together.', 'Breathing out, bend forward from the hips and let your hands go towards your shins or feet, knees soft.', 'Breathing in, come up slowly.'],
    safety: 'The Common Yoga Protocol advises people with back problems, heart disease or high blood pressure not to do this.',
  },
  {
    id: 'ardha-chakrasana', name: 'Standing half backbend', also: 'Ardha Chakrasana', group: 'yoga', level: 1, kit: 'none', areas: ['lower-back', 'neck'], muscles: ['lower back'], tags: ['back-extension'],
    dose: { reps: 2, seconds: 10 }, source: 'cyp',
    steps: ['Stand with hands supporting your lower back, fingers pointing down.', 'Breathing in, lean back gently from the waist, keeping your neck long.', 'Breathing out, return to upright.'],
    safety: 'Avoid if you have vertigo or a tendency to feel giddy.',
  },
  {
    id: 'trikonasana', name: 'Triangle pose', also: 'Trikonasana', group: 'yoga', level: 2, kit: 'none', areas: ['hip', 'lower-back'], muscles: ['abductors', 'hamstrings'], tags: [],
    dose: { reps: 2, seconds: 10, perSide: true }, source: 'cyp',
    steps: ['Stand with feet wide apart and arms out to the sides.', 'Bend sideways to rest one hand on your leg as low as is comfortable, other arm up.', 'Hold, return, and change sides.'],
  },
  {
    id: 'bhadrasana', name: 'Butterfly sit', also: 'Bhadrasana', group: 'yoga', level: 1, kit: 'none', areas: ['hip', 'knee'], muscles: ['adductors'], tags: ['floor'],
    dose: { reps: 1, seconds: 30 }, source: 'cyp',
    steps: ['Sit with your legs out in front.', 'Bend your knees and bring the soles of your feet together.', 'Hold your feet and let your knees relax down. Sit tall.'],
    safety: 'Avoid with severe arthritis of the knees or hips.',
  },
  {
    id: 'vajrasana', name: 'Thunderbolt sit', also: 'Vajrasana', group: 'yoga', level: 1, kit: 'none', areas: ['knee', 'ankle'], muscles: ['quadriceps'], tags: ['floor', 'kneeling', 'deep-knee'],
    dose: { minutes: 2 }, source: 'cyp',
    steps: ['Kneel and sit back on your heels, big toes touching.', 'Rest your hands on your knees and sit tall.', 'Breathe slowly. Sit on a cushion if your knees or ankles complain.'],
    safety: 'Avoid with knee problems or after recent knee surgery.',
  },
  {
    id: 'ustrasana-half', name: 'Half camel pose', also: 'Ardha Ustrasana', group: 'yoga', level: 2, kit: 'none', areas: ['lower-back', 'neck'], muscles: ['lower back'], tags: ['floor', 'kneeling', 'back-extension'],
    dose: { reps: 2, seconds: 10 }, source: 'cyp',
    steps: ['Kneel with knees hip-width apart and hands on your lower back.', 'Breathing in, lean back gently from the waist, chest lifted.', 'Breathing out, return to upright.'],
    safety: 'Avoid with heart disease or after abdominal surgery.',
  },
  {
    id: 'shashankasana', name: 'Hare pose', also: 'Shashankasana', group: 'yoga', level: 1, kit: 'none', areas: ['lower-back', 'knee'], muscles: ['lower back'], tags: ['floor', 'kneeling', 'deep-knee', 'spinal-flexion', 'head-down'],
    dose: { reps: 2, seconds: 15 }, source: 'cyp',
    steps: ['Kneel and sit back on your heels.', 'Breathing out, bend forward and rest your forehead on the floor with arms stretched ahead.', 'Breathing in, come up.'],
    safety: 'Avoid with acute back pain, after knee surgery, or with high blood pressure.',
  },
  {
    id: 'vakrasana', name: 'Seated twist', also: 'Vakrasana', group: 'yoga', level: 2, kit: 'none', areas: ['lower-back', 'upper-back', 'hip'], muscles: ['middle back', 'abdominals'], tags: ['floor', 'twist'],
    dose: { reps: 2, seconds: 10, perSide: true }, source: 'cyp',
    steps: ['Sit with legs out in front and bend one knee, foot beside the other knee.', 'Turn towards the bent knee, one hand behind you, the other arm around the knee.', 'Hold, return, and change sides.'],
    safety: 'Avoid with severe back or spine problems, and during pregnancy.',
  },
  {
    id: 'bhujangasana', name: 'Cobra pose', also: 'Bhujangasana', group: 'yoga', level: 2, kit: 'none', areas: ['lower-back', 'wrist'], muscles: ['lower back'], tags: ['floor', 'prone', 'back-extension', 'wrist-load'],
    dose: { reps: 2, seconds: 10 }, source: 'cyp',
    steps: ['Lie face down with hands beside your chest, elbows close in.', 'Breathing in, lift your head and chest, keeping your navel on the floor.', 'Breathing out, lower.'],
    safety: 'Avoid after abdominal surgery, with a hernia, or during pregnancy.',
  },
  {
    id: 'shalabhasana', name: 'Locust pose', also: 'Shalabhasana', group: 'yoga', level: 2, kit: 'none', areas: ['lower-back', 'hip'], muscles: ['lower back', 'glutes'], tags: ['floor', 'prone', 'back-extension'],
    dose: { reps: 2, seconds: 10 }, source: 'cyp',
    steps: ['Lie face down with arms by your sides or under your thighs.', 'Lift one or both straight legs a little off the floor.', 'Hold, then lower slowly.'],
    safety: 'Avoid with heart disease, after abdominal surgery, or during pregnancy.',
  },
  {
    id: 'makarasana', name: 'Crocodile rest', also: 'Makarasana', group: 'yoga', level: 1, kit: 'none', areas: [], muscles: [], tags: ['floor', 'prone'],
    dose: { minutes: 2 }, source: 'cyp',
    steps: ['Lie face down with your head resting on your folded arms.', 'Let your legs relax a little apart.', 'Breathe slowly into your belly.'],
  },
  {
    id: 'setu-bandhasana', name: 'Bridge pose', also: 'Setu Bandhasana', group: 'yoga', level: 2, kit: 'none', areas: ['hip', 'lower-back', 'neck'], muscles: ['glutes', 'hamstrings'], tags: ['floor', 'supine'],
    dose: { reps: 2, seconds: 10 }, source: 'cyp',
    steps: ['Lie on your back, knees bent, feet near your bottom.', 'Breathing in, lift your hips and hold your ankles or rest your hands by your sides.', 'Breathing out, lower slowly.'],
    safety: 'Avoid with a hernia or after abdominal surgery.',
  },
  {
    id: 'uttana-padasana', name: 'Raised legs pose', also: 'Uttanapadasana', group: 'yoga', level: 2, kit: 'none', areas: ['core', 'lower-back'], muscles: ['abdominals'], tags: ['floor', 'supine', 'abdominal-strain'],
    dose: { reps: 2, seconds: 10 }, source: 'cyp',
    steps: ['Lie on your back, hands by your sides.', 'Breathing in, raise both straight legs to about 30 degrees.', 'Hold, breathing normally, then lower slowly.'],
    safety: 'Avoid with high blood pressure or back pain; bend one knee to make it easier.',
  },
  {
    id: 'shavasana', name: 'Relaxation pose', also: 'Shavasana', group: 'yoga', level: 1, kit: 'none', areas: [], muscles: [], tags: ['floor', 'supine'],
    dose: { minutes: 5 }, source: 'cyp',
    steps: ['Lie on your back with arms a little away from your sides, palms up.', 'Close your eyes and let your body go heavy.', 'Breathe slowly and notice each part of the body relax.'],
  },
  {
    id: 'chair-yoga-stretch', name: 'Seated side stretch', also: 'Tiryaka Tadasana (seated)', group: 'yoga', level: 1, kit: 'chair', areas: ['shoulder', 'lower-back'], muscles: ['lats'], tags: [],
    dose: { reps: 3, seconds: 10, perSide: true }, source: 'cyp',
    steps: ['Sit upright on a chair.', 'Raise one arm and lean gently to the other side.', 'Hold, return, and change sides.'],
  },

  // ---- breathing ----
  {
    id: 'nadi-shodhana', name: 'Alternate nostril breathing', also: 'Nadi Shodhana', group: 'breathing', level: 1, kit: 'chair', areas: [], muscles: [], tags: [],
    dose: { minutes: 3 }, source: 'cyp',
    steps: ['Sit comfortably with your back upright.', 'Close the right nostril with your thumb and breathe in through the left; close the left and breathe out through the right.', 'Breathe in through the right, then out through the left. That is one round. Breathe gently; do not hold your breath.'],
  },
  {
    id: 'bhramari', name: 'Humming bee breath', also: 'Bhramari', group: 'breathing', level: 1, kit: 'chair', areas: [], muscles: [], tags: [],
    dose: { reps: 5 }, source: 'cyp',
    steps: ['Sit comfortably and close your eyes.', 'Breathe in through the nose.', 'Breathe out slowly while making a soft humming sound.'],
  },
  {
    id: 'kapalabhati', name: 'Skull-shining breath', also: 'Kapalabhati', group: 'breathing', level: 2, kit: 'chair', areas: ['core'], muscles: ['abdominals'], tags: ['forceful-breath', 'abdominal-strain'],
    dose: { reps: 20 }, source: 'cyp',
    steps: ['Sit upright.', 'Breathe out sharply through the nose by pulling the belly in; let the breath in happen by itself.', 'Start with 20 and rest.'],
    safety: 'The Common Yoga Protocol advises against this with heart disease, high blood pressure, vertigo, epilepsy, hernia, after abdominal surgery and during pregnancy.',
  },
  {
    id: 'belly-breathing', name: 'Slow belly breathing', group: 'breathing', level: 1, kit: 'chair', areas: [], muscles: [], tags: [],
    dose: { minutes: 3 }, source: 'nhs-sitting',
    steps: ['Sit or lie comfortably with one hand on your belly.', 'Breathe in slowly through your nose so your belly rises.', 'Breathe out slowly and fully. Keep it gentle.'],
  },
]

export const byId = new Map(EXERCISES.map((e) => [e.id, e]))

export const GROUPS: Record<Group, string> = {
  aerobic: 'Moving (aerobic)',
  strength: 'Strength',
  balance: 'Balance',
  flexibility: 'Stretching',
  yoga: 'Yoga',
  breathing: 'Breathing',
}

export const KITS: Record<Kit, string> = {
  none: 'Nothing',
  chair: 'A chair',
  wall: 'A wall',
  stairs: 'Stairs',
  weights: 'Hand weights',
}

export const EVIDENCE: Record<Evidence, string> = {
  guideline: 'Public health guidance',
  trial: 'Tested in trials',
  traditional: 'Traditional practice',
}

/** "2 sets of 10", "20 seconds, 3 times, each side", "10 minutes". */
export function showDose(d: Dose): string {
  const side = d.perSide ? ' each side' : ''
  if (d.minutes) return `${d.minutes} minute${d.minutes === 1 ? '' : 's'}`
  if (d.seconds) {
    const n = d.sets ?? d.reps ?? 1
    return `hold ${d.seconds} seconds${n > 1 ? `, ${n} times` : ''}${side}`
  }
  if (d.reps) return d.sets && d.sets > 1 ? `${d.sets} sets of ${d.reps}${side}` : `${d.reps} times${side}`
  return ''
}

// ---- Ayurveda: tradition notes ----
// Classical Ayurvedic principles on exercise (vyayama). These are shown only
// when the person turns them on, always labelled as traditional and untested
// in trials, and they never change a plan or a safety rule.

export interface Tradition {
  id: string
  title: string
  text: string
  basis: string
}

export const AYURVEDA: Tradition[] = [
  {
    id: 'balardha', title: 'Half your strength (balardha)',
    text: 'Classical texts advise exercising to about half of your capacity: stop when you first sweat on the forehead or breathe through the mouth. This matches the "you can talk but not sing" pace used for moderate exercise.',
    basis: 'Charaka Samhita and Ashtanga Hridaya (classical texts); no trials of this rule.',
  },
  {
    id: 'season', title: 'Season (ritu)',
    text: 'Tradition suggests more exercise in the cool season and less in hot weather and the rains. In heat, exercise early and drink water.',
    basis: 'Classical seasonal regimen (ritucharya); no trials.',
  },
  {
    id: 'time', title: 'Time of day',
    text: 'Morning, before eating, is the traditional time for exercise. Any time you can keep to is better than none.',
    basis: 'Classical daily regimen (dinacharya); no trials.',
  },
  {
    id: 'after', title: 'After exercise',
    text: 'Tradition advises resting until the breath settles and gently massaging the body (abhyanga) before bathing.',
    basis: 'Classical daily regimen (dinacharya); no trials.',
  },
  {
    id: 'who', title: 'Who should go easy',
    text: 'Classical texts say children, older people, and people who are unwell, very tired or have just eaten should exercise lightly. Modern guidance agrees that you should build up from where you are.',
    basis: 'Classical texts; consistent with UK CMO 2019 advice to build up gradually.',
  },
]
