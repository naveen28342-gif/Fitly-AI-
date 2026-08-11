(function (root) {
  'use strict';

  function exercise(name, primary, secondary, pattern, equipment, difficulty, sets, reps, rir, rest, technique, mistakes, progression, regression, substitutions, category, fatigueCost) {
    return { name, primary, secondary, pattern, equipment, difficulty, skillRequirement: difficulty, sets, reps, rir, rest, technique, commonMistakes: mistakes, progressionMethod: progression, regression, substitutions, unilateral: /split|lunge|single|one-arm/i.test(name), category: category || 'compound', fatigueCost: fatigueCost || 'moderate' };
  }

  const database = {
    'back-squat': exercise('Back squat', 'Quads', 'Glutes, core', 'Squat', 'Barbell + rack', 'Intermediate', 3, '5-8', '2 RIR', '3 min', 'Brace before each rep, sit between the hips, and drive up through the whole foot.', 'Knees collapsing in, losing brace, cutting depth when fatigued.', 'Reach 3 x 8 at the target RIR, then add 2.5-5 kg.', 'Goblet squat', ['Hack squat', 'Leg press', 'Smith squat'], 'compound', 'high'),
    'goblet-squat': exercise('Goblet squat', 'Quads', 'Glutes, core', 'Squat', 'Dumbbell, kettlebell, or backpack', 'Beginner', 3, '8-12', '2 RIR', '2 min', 'Hold the load close, keep the ribs stacked, and control the bottom position.', 'Folding forward, rushing the descent, heels lifting.', 'Reach 12 reps on every set, then add a small amount of load.', 'Box squat', ['Split squat', 'Leg press', 'Bodyweight squat'], 'compound', 'moderate'),
    'barbell-bench': exercise('Barbell bench press', 'Chest', 'Triceps, front delts', 'Horizontal push', 'Barbell + bench', 'Intermediate', 3, '6-8', '2 RIR', '2-3 min', 'Set the shoulder blades, keep feet planted, and lower the bar with control.', 'Bouncing the bar, flared elbows, losing contact with the bench.', 'Reach 3 x 8 at 2 RIR, then add 2.5 kg.', 'Incline push-up', ['Dumbbell bench press', 'Machine chest press', 'Push-up'], 'compound', 'moderate'),
    'push-up': exercise('Push-up', 'Chest', 'Triceps, shoulders, core', 'Horizontal push', 'Bodyweight or elevated surface', 'Beginner', 3, '8-15', '2 RIR', '90 sec', 'Keep a straight line from head to heel and lower the chest between the hands.', 'Sagging hips, shrugging, stopping short of a comfortable range.', 'Reach 15 reps, then lower the incline or add a backpack.', 'Wall or incline push-up', ['Dumbbell bench press', 'Floor press'], 'compound', 'moderate'),
    'lat-pulldown': exercise('Lat pulldown', 'Lats', 'Biceps, upper back', 'Vertical pull', 'Cable machine', 'Beginner', 3, '8-12', '1-2 RIR', '2 min', 'Pull elbows toward the ribs and pause when the bar reaches the upper chest.', 'Pulling behind the neck, swinging, turning it into a row.', 'Reach 12 reps before increasing one small plate.', 'Band pulldown', ['Pull-up', 'Assisted pull-up', 'Band pulldown'], 'compound', 'moderate'),
    'band-pulldown': exercise('Band pulldown', 'Lats', 'Biceps, upper back', 'Vertical pull', 'Resistance band', 'Beginner', 3, '10-15', '2 RIR', '90 sec', 'Anchor the band overhead and pull elbows down without leaning back.', 'Snapping the band, shrugging, arching aggressively.', 'Add reps or band tension while keeping a one-second squeeze.', 'Straight-arm pulldown', ['Doorway row', 'Assisted pull-up'], 'compound', 'low'),
    'chest-row': exercise('Chest-supported row', 'Upper back', 'Lats, rear delts, biceps', 'Horizontal pull', 'Dumbbells or machine', 'Beginner', 3, '8-12', '1-2 RIR', '2 min', 'Keep the chest supported and pull elbows toward the hips.', 'Shrugging, bouncing the weights, reaching with the neck.', 'Reach 12 reps, then increase the smallest useful load.', 'One-arm backpack row', ['Seated cable row', 'One-arm dumbbell row'], 'compound', 'moderate'),
    'backpack-row': exercise('One-arm backpack row', 'Upper back', 'Lats, rear delts, biceps', 'Horizontal pull', 'Loaded backpack or band', 'Beginner', 3, '10-15/side', '2 RIR', '90 sec', 'Hinge softly, brace the free hand, and pull the bag toward the hip.', 'Twisting the torso, yanking, shoulder rolling forward.', 'Add books or reps while keeping the torso still.', 'Supported backpack row', ['Resistance-band row', 'Dumbbell row'], 'compound', 'moderate'),
    'romanian-deadlift': exercise('Romanian deadlift', 'Hamstrings', 'Glutes, upper back', 'Hinge', 'Barbell or dumbbells', 'Intermediate', 3, '6-10', '2 RIR', '2-3 min', 'Push the hips back, keep the load close, and stop when the hamstrings limit range.', 'Rounding the back, squatting the movement, load drifting away.', 'Reach 10 reps, then add 2.5-5 kg with the same tempo.', 'Dowel hip hinge', ['Dumbbell RDL', 'Backpack RDL', 'Hip thrust'], 'compound', 'high'),
    'backpack-rdl': exercise('Backpack Romanian deadlift', 'Hamstrings', 'Glutes, upper back', 'Hinge', 'Loaded backpack', 'Beginner', 3, '10-15', '2 RIR', '90 sec', 'Keep the bag close to the legs and move from the hips, not the lower back.', 'Bending the knees too much, rounding, rushing the return.', 'Add books, then reps while preserving a slow three-second descent.', 'Glute bridge', ['Dumbbell RDL', 'Good morning'], 'compound', 'moderate'),
    'overhead-press': exercise('Overhead press', 'Shoulders', 'Triceps, upper chest, core', 'Vertical push', 'Barbell or dumbbells', 'Intermediate', 3, '6-10', '2 RIR', '2-3 min', 'Squeeze the glutes, press in a straight path, and finish with biceps near the ears.', 'Leaning back, flared ribs, pressing around the face.', 'Reach 10 reps, then add 1-2.5 kg.', 'Seated dumbbell press', ['Landmine press', 'Pike push-up'], 'compound', 'moderate'),
    'pike-push-up': exercise('Pike push-up', 'Shoulders', 'Triceps, upper chest, core', 'Vertical push', 'Bodyweight', 'Beginner', 3, '6-12', '2 RIR', '90 sec', 'Create an inverted V and lower the crown of the head between the hands.', 'Collapsing shoulders, flared elbows, rushing reps.', 'Elevate the feet only after 12 controlled reps.', 'Incline pike push-up', ['Dumbbell shoulder press', 'Landmine press'], 'compound', 'moderate'),
    'leg-press': exercise('Leg press', 'Quads', 'Glutes, hamstrings', 'Knee dominant', 'Leg press machine', 'Beginner', 3, '10-15', '1-2 RIR', '2 min', 'Lower until the hips stay planted, then push evenly through the feet.', 'Locking knees hard, lifting hips, using a shallow range.', 'Reach 15 reps before moving the sled up one small increment.', 'Goblet squat', ['Hack squat', 'Split squat'], 'compound', 'moderate'),
    'split-squat': exercise('Bulgarian split squat', 'Quads', 'Glutes, adductors', 'Single-leg squat', 'Dumbbells or bodyweight', 'Intermediate', 3, '8-12/leg', '2 RIR', '2 min', 'Use a stable stance, lower under control, and keep the front foot fully planted.', 'Pushing off the back leg, wobbling, front knee collapsing.', 'Add reps on both legs, then add load.', 'Supported split squat', ['Reverse lunge', 'Step-up', 'Leg press'], 'compound', 'high'),
    'reverse-lunge': exercise('Reverse lunge', 'Quads', 'Glutes, hamstrings', 'Single-leg squat', 'Bodyweight, dumbbells, or backpack', 'Beginner', 3, '8-12/leg', '2 RIR', '90 sec', 'Step back softly, keep the front heel grounded, and stand through the front leg.', 'Short steps, crashing the knee, driving from the back foot.', 'Reach 12 reps, then add load or a slower descent.', 'Supported reverse lunge', ['Split squat', 'Step-up'], 'compound', 'moderate'),
    'leg-curl': exercise('Leg curl', 'Hamstrings', 'Calves', 'Knee flexion', 'Machine', 'Beginner', 3, '10-15', '1-2 RIR', '90 sec', 'Keep the hips down and curl smoothly without kicking the weight.', 'Lifting hips, shortening range, using momentum.', 'Reach 15 reps, then increase the stack slightly.', 'Slider leg curl', ['Seated leg curl', 'Slider leg curl'], 'isolation', 'low'),
    'hamstring-slide': exercise('Hamstring slide curl', 'Hamstrings', 'Glutes, core', 'Knee flexion', 'Towel or sliders', 'Intermediate', 3, '8-12', '2 RIR', '90 sec', 'Bridge the hips and slide heels away slowly, keeping the ribs down.', 'Dropping hips, rushing the eccentric, overextending the back.', 'Increase distance or use single-leg reps only when control is solid.', 'Glute bridge', ['Leg curl', 'Swiss-ball curl'], 'isolation', 'moderate'),
    'hip-thrust': exercise('Hip thrust', 'Glutes', 'Hamstrings, core', 'Hip extension', 'Barbell, dumbbell, or machine', 'Beginner', 3, '8-12', '1-2 RIR', '2 min', 'Tuck the chin, brace the ribs, and finish with the hips fully extended.', 'Overarching, hyperextending at the top, feet too far away.', 'Pause at the top for one second and add reps before load.', 'Glute bridge', ['Cable pull-through', 'Glute bridge'], 'compound', 'moderate'),
    'glute-bridge': exercise('Glute bridge', 'Glutes', 'Hamstrings, core', 'Hip extension', 'Bodyweight or backpack', 'Beginner', 3, '12-20', '2 RIR', '60-90 sec', 'Drive through the heels and squeeze the glutes without arching the back.', 'Rib flare, pushing from toes, rushing the top position.', 'Reach 20 reps, then add a backpack or move to single-leg.', 'Bodyweight glute bridge', ['Hip thrust', 'Band hip thrust'], 'isolation', 'low'),
    'lateral-raise': exercise('Lateral raise', 'Lateral delts', 'Upper traps', 'Shoulder abduction', 'Dumbbells or cable', 'Beginner', 3, '12-20', '1-2 RIR', '60-90 sec', 'Raise with soft elbows to shoulder height while keeping the neck relaxed.', 'Swinging, shrugging, turning it into a front raise.', 'Reach 20 reps, then use the next small load.', 'Wall-supported raise', ['Cable lateral raise', 'Band lateral raise'], 'isolation', 'low'),
    'band-lateral-raise': exercise('Band lateral raise', 'Lateral delts', 'Upper traps', 'Shoulder abduction', 'Resistance band', 'Beginner', 3, '12-20', '1-2 RIR', '60 sec', 'Stand on the band and lift smoothly without shrugging.', 'Swinging or letting the band snap down.', 'Increase band tension or add reps while keeping control.', 'No-load shoulder raise', ['Dumbbell lateral raise', 'Cable lateral raise'], 'isolation', 'low'),
    'cable-triceps': exercise('Cable triceps extension', 'Triceps', 'Shoulders', 'Elbow extension', 'Cable machine', 'Beginner', 2, '10-15', '1-2 RIR', '60-90 sec', 'Keep elbows close and move only at the elbow joint.', 'Elbows drifting forward, leaning into the stack, rushing lockout.', 'Reach 15 reps, then increase one small plate.', 'Close-grip push-up', ['Overhead cable extension', 'Dumbbell extension'], 'isolation', 'low'),
    'close-grip-pushup': exercise('Close-grip push-up', 'Triceps', 'Chest, shoulders, core', 'Elbow extension', 'Bodyweight or elevated surface', 'Beginner', 2, '8-15', '2 RIR', '90 sec', 'Use a slightly narrow hand position and keep elbows about 30-45 degrees from the ribs.', 'Hands too narrow, sagging hips, losing shoulder control.', 'Add reps, lower the incline, or add a backpack.', 'Incline close-grip push-up', ['Cable triceps extension', 'Dumbbell extension'], 'isolation', 'moderate'),
    'dumbbell-curl': exercise('Dumbbell curl', 'Biceps', 'Forearms', 'Elbow flexion', 'Dumbbells or band', 'Beginner', 2, '10-15', '1-2 RIR', '60-90 sec', 'Keep the upper arm still and lower the weight fully under control.', 'Swinging, leaning back, cutting the lowering phase.', 'Reach 15 reps, then use the next small load.', 'Band curl', ['Incline dumbbell curl', 'Backpack curl'], 'isolation', 'low'),
    'backpack-curl': exercise('Backpack curl', 'Biceps', 'Forearms', 'Elbow flexion', 'Loaded backpack', 'Beginner', 2, '10-15', '1-2 RIR', '60 sec', 'Hold the straps, keep elbows by the ribs, and lower slowly.', 'Swinging or using too much load for a full range.', 'Add books or reps while keeping a two-second lowering phase.', 'Isometric curl hold', ['Band curl', 'Dumbbell curl'], 'isolation', 'low'),
    'face-pull': exercise('Face pull', 'Rear delts', 'Mid traps, rotator cuff', 'Horizontal pull', 'Cable or resistance band', 'Beginner', 2, '12-20', '2 RIR', '60-90 sec', 'Pull toward the forehead and rotate the hands apart at the finish.', 'Shrugging, pulling to the chest, using momentum.', 'Add reps or a small amount of resistance while keeping the pause.', 'Band pull-apart', ['Reverse fly', 'Band pull-apart'], 'isolation', 'low'),
    'cable-crunch': exercise('Cable crunch', 'Abs', 'Hip flexors', 'Trunk flexion', 'Cable machine', 'Beginner', 3, '10-15', '1-2 RIR', '60-90 sec', 'Curl the ribs toward the pelvis and keep the hips still.', 'Pulling with the arms, hinging at the hips, rushing reps.', 'Reach 15 reps, then increase one small plate.', 'Dead bug', ['Ab wheel', 'Dead bug'], 'isolation', 'low'),
    'dead-bug': exercise('Dead bug', 'Core', 'Hip flexors, shoulders', 'Anti-extension', 'Bodyweight', 'Beginner', 3, '8-12/side', '2 RIR', '60 sec', 'Press the lower back gently toward the floor and move opposite limbs slowly.', 'Arching the back, holding breath, moving too quickly.', 'Add reps or extend limbs farther while keeping the back quiet.', 'Heel taps', ['Plank', 'Cable crunch'], 'isolation', 'low'),
    'plank': exercise('Front plank', 'Core', 'Shoulders, glutes', 'Anti-extension', 'Bodyweight', 'Beginner', 3, '30-45 sec', '2 RIR', '60-90 sec', 'Squeeze the glutes, brace the trunk, and breathe behind the brace.', 'Sagging hips, piking up, holding breath.', 'Add five seconds per set until 45 seconds, then use a harder variation.', 'Elevated plank', ['Dead bug', 'Side plank'], 'isolation', 'low'),
    'trap-bar-deadlift': exercise('Trap-bar deadlift', 'Glutes', 'Quads, hamstrings, upper back', 'Hinge', 'Trap bar', 'Intermediate', 3, '4-6', '2 RIR', '3 min', 'Brace, push the floor away, and keep the handles balanced over mid-foot.', 'Jerking from the floor, rounding, leaning back at lockout.', 'Reach 3 x 6, then add 5 kg.', 'Kettlebell deadlift', ['Romanian deadlift', 'Rack pull'], 'compound', 'high'),
    'hack-squat': exercise('Hack squat', 'Quads', 'Glutes', 'Squat', 'Hack squat machine', 'Beginner', 3, '8-12', '1-2 RIR', '2-3 min', 'Keep the back against the pad and lower through a comfortable range.', 'Knees collapsing, cutting depth from fatigue, locking out hard.', 'Reach 12 reps, then increase the sled slightly.', 'Goblet squat', ['Leg press', 'Smith squat'], 'compound', 'high'),
    'machine-chest-press': exercise('Machine chest press', 'Chest', 'Triceps, front delts', 'Horizontal push', 'Chest press machine', 'Beginner', 3, '8-12', '1-2 RIR', '2 min', 'Set handles around mid-chest and press without shoulders rolling forward.', 'Bouncing the stack, shrugging, overextending the shoulders.', 'Reach 12 reps, then increase one small plate.', 'Incline push-up', ['Dumbbell bench press', 'Push-up'], 'compound', 'moderate'),
    'cable-row': exercise('Seated cable row', 'Upper back', 'Lats, biceps, rear delts', 'Horizontal pull', 'Cable machine', 'Beginner', 3, '8-12', '1-2 RIR', '2 min', 'Stay tall, reach without losing the brace, then pull elbows past the torso.', 'Leaning back, shrugging, lower-back swing.', 'Reach 12 reps, then increase one small plate.', 'Band row', ['Chest-supported row', 'One-arm row'], 'compound', 'moderate'),
    'incline-press': exercise('Incline dumbbell press', 'Upper chest', 'Triceps, front delts', 'Incline push', 'Dumbbells + bench', 'Beginner', 3, '8-12', '1-2 RIR', '2 min', 'Keep shoulder blades supported and lower dumbbells toward the upper chest.', 'Dropping elbows too low, bouncing, losing wrist position.', 'Reach 12 reps, then increase the dumbbells slightly.', 'Incline push-up', ['Machine chest press', 'Landmine press'], 'compound', 'moderate'),
    'standing-calf-raise': exercise('Standing calf raise', 'Calves', 'Ankle stabilizers', 'Plantar flexion', 'Machine, dumbbells, or backpack', 'Beginner', 3, '10-20', '1-2 RIR', '60-90 sec', 'Use a full stretch and pause at the top without bouncing.', 'Bouncing, shortening the range, rolling the ankles.', 'Reach 20 reps, then add load.', 'Bodyweight calf raise', ['Seated calf raise', 'Single-leg calf raise'], 'isolation', 'low'),
    'calf-raise': exercise('Calf raise', 'Calves', 'Ankle stabilizers', 'Plantar flexion', 'Bodyweight or backpack', 'Beginner', 3, '12-20', '1-2 RIR', '60 sec', 'Use a wall for balance and move through the full ankle range.', 'Bouncing or rushing the bottom position.', 'Add reps, then load a backpack or progress to single-leg.', 'Seated calf raise', ['Standing calf raise', 'Single-leg calf raise'], 'isolation', 'low')
  };

  const movementVariants = {
    squat: { gym: 'back-squat', home: 'goblet-squat' }, horizontalPush: { gym: 'barbell-bench', home: 'push-up' }, horizontalPull: { gym: 'chest-row', home: 'backpack-row' },
    hinge: { gym: 'romanian-deadlift', home: 'backpack-rdl' }, verticalPush: { gym: 'overhead-press', home: 'pike-push-up' }, verticalPull: { gym: 'lat-pulldown', home: 'band-pulldown' },
    quad: { gym: 'leg-press', home: 'split-squat' }, unilateralQuad: { gym: 'split-squat', home: 'reverse-lunge' }, hamstring: { gym: 'leg-curl', home: 'hamstring-slide' },
    glute: { gym: 'hip-thrust', home: 'glute-bridge' }, calf: { gym: 'standing-calf-raise', home: 'calf-raise' }, lateral: { gym: 'lateral-raise', home: 'band-lateral-raise' },
    triceps: { gym: 'cable-triceps', home: 'close-grip-pushup' }, biceps: { gym: 'dumbbell-curl', home: 'backpack-curl' }, facePull: { gym: 'face-pull', home: 'face-pull' },
    core: { gym: 'cable-crunch', home: 'dead-bug' }, chestPress: { gym: 'machine-chest-press', home: 'push-up' }, deadlift: { gym: 'trap-bar-deadlift', home: 'backpack-rdl' }, inclinePress: { gym: 'incline-press', home: 'push-up' }
  };

  const splitTemplates = {
    'Full body A': ['squat', 'horizontalPush', 'horizontalPull', 'hinge', 'lateral', 'core'],
    'Full body B': ['quad', 'verticalPush', 'verticalPull', 'glute', 'biceps', 'core'],
    'Upper A': ['horizontalPush', 'verticalPull', 'inclinePress', 'horizontalPull', 'lateral', 'triceps', 'biceps'],
    'Lower A': ['squat', 'hinge', 'quad', 'hamstring', 'calf', 'core'],
    'Upper B': ['verticalPush', 'horizontalPull', 'chestPress', 'verticalPull', 'lateral', 'triceps', 'biceps'],
    'Lower B': ['deadlift', 'unilateralQuad', 'glute', 'hamstring', 'calf', 'core'],
    Push: ['horizontalPush', 'verticalPush', 'inclinePress', 'lateral', 'triceps'],
    Pull: ['verticalPull', 'horizontalPull', 'facePull', 'biceps', 'horizontalPull'],
    Legs: ['squat', 'hinge', 'unilateralQuad', 'hamstring', 'calf', 'core'],
    'Push B': ['verticalPush', 'horizontalPush', 'chestPress', 'lateral', 'triceps'],
    'Pull B': ['verticalPull', 'horizontalPull', 'facePull', 'biceps', 'horizontalPull'],
    'Legs B': ['deadlift', 'unilateralQuad', 'glute', 'hamstring', 'calf', 'core']
  };

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const scheduleByDays = {
    1: [['Monday', 'Full body A']],
    2: [['Monday', 'Full body A'], ['Thursday', 'Full body B']],
    3: [['Monday', 'Full body A'], ['Wednesday', 'Full body B'], ['Friday', 'Full body A']],
    4: [['Monday', 'Upper A'], ['Tuesday', 'Lower A'], ['Thursday', 'Upper B'], ['Friday', 'Lower B']],
    5: [['Monday', 'Push'], ['Tuesday', 'Pull'], ['Wednesday', 'Legs'], ['Thursday', 'Upper A'], ['Friday', 'Lower A']],
    6: [['Monday', 'Push'], ['Tuesday', 'Pull'], ['Wednesday', 'Legs'], ['Thursday', 'Push B'], ['Friday', 'Pull B'], ['Saturday', 'Legs B']]
  };

  function safeNumber(value, fallback = null) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }
  function equipmentMode(profile, preferences) {
    const value = String(profile?.equipment || preferences?.equipment || '').toLowerCase();
    return value.includes('gym') || value.includes('barbell') ? 'gym' : 'home';
  }
  function goalSettings(goal) {
    if (goal === 'Strength training') return { focus: 'Strength practice', compoundReps: '3-6', compoundSets: 3, accessorySets: 2, description: 'Practice strong, repeatable reps with longer rests and enough reserve to keep technique sharp.' };
    if (goal === 'Fat loss') return { focus: 'Muscle retention', compoundReps: '6-10', compoundSets: 3, accessorySets: 2, description: 'Keep resistance training purposeful while managing fatigue; conditioning stays modest so recovery is protected.' };
    return { focus: 'Hypertrophy', compoundReps: '6-12', compoundSets: 3, accessorySets: 3, description: 'Accumulate quality work across a practical rep range and progress only when recovery supports it.' };
  }
  function requestedDays(profile) {
    const value = Math.round(safeNumber(profile?.trainingDays, 3));
    return Math.min(6, Math.max(1, value || 3));
  }
  function scheduleEntries(profile) {
    const days = requestedDays(profile);
    const preferred = profile?.split || 'auto';
    if (preferred === 'full_body') {
      const slots = days === 1 ? ['Monday'] : days === 2 ? ['Monday', 'Thursday'] : days === 3 ? ['Monday', 'Wednesday', 'Friday'] : ['Monday', 'Tuesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].slice(0, days);
      return slots.map((day, index) => [day, index % 2 ? 'Full body B' : 'Full body A']);
    }
    if (preferred === 'upper_lower' && days >= 4) {
      const slots = days === 4 ? [['Monday', 'Upper A'], ['Tuesday', 'Lower A'], ['Thursday', 'Upper B'], ['Friday', 'Lower B']] : [['Monday', 'Upper A'], ['Tuesday', 'Lower A'], ['Thursday', 'Upper B'], ['Friday', 'Lower B'], ['Saturday', 'Full body A']];
      return slots.slice(0, days);
    }
    if (preferred === 'ppl') {
      if (days === 3) return [['Monday', 'Push'], ['Wednesday', 'Pull'], ['Friday', 'Legs']];
      if (days === 4) return [['Monday', 'Push'], ['Tuesday', 'Pull'], ['Thursday', 'Legs'], ['Friday', 'Full body A']];
      if (days === 5) return [['Monday', 'Push'], ['Tuesday', 'Pull'], ['Wednesday', 'Legs'], ['Thursday', 'Upper A'], ['Friday', 'Lower A']];
      if (days === 6) return [['Monday', 'Push'], ['Tuesday', 'Pull'], ['Wednesday', 'Legs'], ['Thursday', 'Push B'], ['Friday', 'Pull B'], ['Saturday', 'Legs B']];
    }
    return scheduleByDays[days] || scheduleByDays[3];
  }
  function weekSchedule(profile) {
    const entries = scheduleEntries(profile);
    const map = new Map(entries);
    return dayNames.map((day) => ({ day, split: map.get(day) || 'Recovery / mobility', isTraining: map.has(day) }));
  }
  function cloneExercise(item) {
    return item ? { ...item, substitutions: Array.isArray(item.substitutions) ? item.substitutions.slice() : [] } : null;
  }
  function selectExercise(movement, mode) {
    const key = movementVariants[movement]?.[mode] || movementVariants[movement]?.home;
    return cloneExercise(database[key]);
  }
  function adjustExercise(item, settings, profile, recoveryState, sessionMinutes) {
    if (!item) return null;
    const isIsolation = item.category === 'isolation';
    const experience = profile?.experience || 'beginner';
    const beginnerFactor = experience === 'beginner' ? 0.72 : experience === 'advanced' ? 1.08 : 1;
    let sets = Math.max(1, Math.round((isIsolation ? settings.accessorySets : settings.compoundSets) * beginnerFactor));
    if (recoveryState === 'reduce') sets = Math.max(1, Math.ceil(sets * 0.6));
    const heavyPattern = ['Squat', 'Hinge', 'Horizontal push', 'Vertical push'].includes(item.pattern) || item.fatigueCost === 'high';
    const reps = isIsolation ? (settings.focus === 'Strength practice' ? '8-15' : '10-20') : settings.focus === 'Strength practice' ? (heavyPattern ? '3-6' : '6-10') : settings.compoundReps;
    const rir = recoveryState === 'reduce' ? '3-4 RIR' : (isIsolation ? '1-2 RIR' : '2 RIR');
    const progressionMethod = settings.focus === 'Strength practice' && !isIsolation ? `Reach the top of ${reps} on all sets at the target RIR, then add the smallest useful load.` : item.progressionMethod;
    const adjusted = { ...item, sets, reps, rir, progressionMethod };
    if (sessionMinutes && sessionMinutes <= 20) adjusted.rest = isIsolation ? '45-60 sec' : '90-120 sec';
    return adjusted;
  }
  function buildWarmup(mode, firstExercise) {
    const equipmentText = mode === 'gym' ? 'treadmill, bike, or rower' : 'brisk walking or marching in place';
    return {
      general: `5-8 min easy ${equipmentText}; finish with hip, shoulder, and ankle mobility.`,
      specific: firstExercise ? `Ramp into ${firstExercise.name}: 1 easy set of 8-10, 1 moderate set of 4-6, then start working sets. Skip extra warm-up volume if you already feel ready.` : '5 minutes of easy movement followed by relaxed mobility.'
    };
  }
  function buildWorkout(day, split, profile = {}, preferences = {}, adaptation = {}) {
    const settings = goalSettings(profile.goal);
    const mode = equipmentMode(profile, preferences);
    const sessionMinutes = Math.max(15, safeNumber(profile.sessionMinutes, 45));
    const reduced = adaptation.recoveryState === 'reduce';
    const recoverySplit = split === 'Recovery / mobility';
    if (recoverySplit) {
      return {
        day, split, title: 'Recovery reset', type: 'RECOVERY - LOW IMPACT', focus: 'Mobility + easy movement', description: 'A lighter day to restore range of motion and energy without chasing fatigue.',
        duration: Math.min(sessionMinutes, 25), equipment: mode === 'gym' ? 'Gym optional' : 'No equipment', meta: ['04', '2', '65'], isTraining: false,
        warmup: { general: '5 min easy walking and relaxed breathing.', specific: 'Move only through pain-free ranges; nothing should feel forced.' },
        exercises: [
          { name: 'Easy walk or cycle', primary: 'Cardio', secondary: 'Circulation', pattern: 'Low-intensity aerobic', equipment: 'Open space or bike', sets: 1, reps: '10-20 min', rir: 'Easy', rest: 'As needed', technique: 'Keep the pace conversational.', commonMistakes: 'Turning recovery into a hard conditioning session.', progressionMethod: 'Add five minutes only if energy improves.', regression: 'Shorten the walk.', substitutions: ['Breathing flow', 'Gentle mobility'], category: 'recovery', fatigueCost: 'low' },
          { name: '90/90 hip switches', primary: 'Hips', secondary: 'Glutes', pattern: 'Mobility', equipment: 'Bodyweight', sets: 2, reps: '6/side', rir: 'Easy', rest: '30 sec', technique: 'Move slowly and stay within a comfortable range.', commonMistakes: 'Forcing end range or bouncing.', progressionMethod: 'Pause for one calm breath on each side.', regression: 'Use hands for support.', substitutions: ['Hip flexor stretch'], category: 'mobility', fatigueCost: 'low' },
          { name: 'Wall slide', primary: 'Shoulders', secondary: 'Upper back', pattern: 'Mobility', equipment: 'Wall', sets: 2, reps: '8-12', rir: 'Easy', rest: '30 sec', technique: 'Keep ribs down and move without pain.', commonMistakes: 'Arching the back to chase range.', progressionMethod: 'Add a slow three-second lowering phase.', regression: 'Reduce the range.', substitutions: ['Open book rotation'], category: 'mobility', fatigueCost: 'low' },
          { name: 'Box breathing', primary: 'Recovery', secondary: 'Stress regulation', pattern: 'Breathing', equipment: 'None', sets: 2, reps: '4 cycles', rir: 'Easy', rest: '30 sec', technique: 'Inhale, hold, exhale, hold for four comfortable counts.', commonMistakes: 'Holding the breath uncomfortably.', progressionMethod: 'Keep the same relaxed pace.', regression: 'Remove the holds.', substitutions: ['Long-exhale breathing'], category: 'recovery', fatigueCost: 'low' }
        ],
        cooldown: ['2-4 min easy walking', 'Gentle chest, hip flexor, and hamstring stretches for 20-30 sec each'],
        progression: { method: 'Recovery progression', rule: 'Keep this day easy; add time only when it leaves you feeling better, not more tired.' },
        recovery: { state: 'recovery', note: 'Use this session between harder days or whenever soreness, sleep, or stress is limiting.' },
        weeklyVolume: {}, tracking: ['Energy before and after', 'Pain or discomfort', 'Sleep tonight']
      };
    }
    const movements = (splitTemplates[split] || splitTemplates['Full body A']).slice();
    const maxExercises = sessionMinutes <= 20 ? 4 : sessionMinutes <= 35 ? 5 : movements.length;
    const exercises = movements.slice(0, maxExercises).map((movement) => adjustExercise(selectExercise(movement, mode), settings, profile, reduced ? 'reduce' : 'train', sessionMinutes)).filter(Boolean);
    const workingSets = exercises.reduce((total, item) => total + item.sets, 0);
    const kcal = Math.max(60, Math.round((safeNumber(profile.weight, 65) * Math.max(20, sessionMinutes) * (profile.goal === 'Fat loss' ? 0.055 : 0.065))));
    const title = `${split} - ${settings.focus}`;
    const volume = exercises.reduce((result, item) => { result[item.primary] = (result[item.primary] || 0) + item.sets; return result; }, {});
    const adjustments = reduced ? ['Reduce working sets by about 40%.', 'Keep 1-2 extra reps in reserve.', 'Skip the final optional accessory if technique or energy falls off.'] : ['Stop each set when technique changes.', 'Keep heavy compounds 2-4 minutes from the next set as prescribed.', 'Add stimulus gradually; more exercises are not automatically better.'];
    return {
      day, split, title, type: `${split.toUpperCase()} - ${settings.focus.toUpperCase()}`, focus: settings.focus, description: `${settings.description}${reduced ? ' Today is automatically adjusted because recovery signals are limited.' : ''}`,
      duration: Math.round(Math.min(sessionMinutes, 8 + exercises.length * 6 + workingSets * 1.5)), equipment: mode === 'gym' ? 'Gym access' : 'Home / dorm-friendly', meta: [String(exercises.length).padStart(2, '0'), String(workingSets), String(kcal)], isTraining: true,
      warmup: buildWarmup(mode, exercises[0]), exercises, cooldown: ['3-5 min easy walking and slow breathing', 'Choose 2-3 stretches for the trained areas; hold each 20-30 sec without forcing range.'],
      progression: { method: 'Double progression', rule: 'Keep the same load until every set reaches the top of its rep range at the prescribed RIR and technique is repeatable; then add the smallest useful load.', nextSession: 'If reps fall below the bottom of the range, keep the load. If performance drops for two sessions with poor recovery, reduce one set.' },
      recovery: { state: reduced ? 'adjusted' : 'ready', note: reduced ? 'Keep the session crisp and leave more reserve today.' : 'Recovery signals support the planned training dose.', adjustments },
      weeklyVolume: volume, tracking: ['Exercise, load, reps, sets', 'RIR or RPE on the final working set', 'Rest time, technique notes, and any pain or discomfort']
    };
  }
  function buildWeek(profile = {}, preferences = {}, adaptation = {}) {
    const entries = scheduleEntries(profile);
    const map = new Map(entries);
    return dayNames.map((day) => {
      const split = map.get(day) || 'Recovery / mobility';
      const workout = buildWorkout(day, split, profile, preferences, adaptation);
      return { day, split, isTraining: workout.isTraining, title: workout.title, type: workout.type, focus: workout.focus, duration: workout.duration, workout };
    });
  }
  const api = { database, movementVariants, splitTemplates, buildWorkout, buildWeek, requestedDays };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FitlyWorkoutEngine = api;
}(typeof globalThis !== 'undefined' ? globalThis : this));
