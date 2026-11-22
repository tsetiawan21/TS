/* Forge Protocol: static content. The wording follows the master prompt.
   Notification bodies stay short: title plus body is never more than 120 characters (scripts/check.mjs enforces it). */
window.FD = (function () {
  'use strict';

  /* The seven daily rituals (section 4C of the prompt: Daily Rituals checklist), in the order you meet them in a day. */
  var RITUALS = [
    { k: 'wake', t: 'Wake up on schedule', h: 'At your set wake time. Never at the cost of enough sleep.', part: 'Morning' },
    { k: 'nophone', t: 'No phone for the first 60 minutes', h: 'When practical. Start the day before the distractions do.', part: 'Morning' },
    { k: 'walk', t: 'Walk for at least 10 minutes', h: '', part: 'Morning' },
    { k: 'priority', t: 'Complete one priority task', h: 'The one that matters most today.', part: 'Day' },
    { k: 'deep', t: 'Complete a deep work session', h: '', part: 'Day' },
    { k: 'learn', t: 'Learn something relevant to your mission', h: '', part: 'Day' },
    { k: 'review', t: 'Review your daily progress', h: 'Before you sleep.', part: 'Evening' }
  ];
  /* A lighter day keeps four essentials (the failure recovery protocol: reduce the workload if necessary). */
  var LIGHT = ['walk', 'priority', 'deep', 'review'];

  /* Scoring bands (section 6). Lower bound, label, one plain sentence. */
  var BANDS = [
    [0, 'Reset Required', 'Time to simplify and restart small. One win today.'],
    [40, 'Inconsistent', 'Some rituals hold, some slip. Find which ones and fix those first.'],
    [60, 'Improving', 'The system is starting to hold. Keep the basics steady.'],
    [80, 'Consistent', 'Most days run on the system, not on motivation.'],
    [95, 'Optimal Execution', 'Nearly everything done. Keep it sustainable, rest is part of it.']
  ];

  var PHASES = [
    { n: 1, name: 'The Cleanse', tag: 'Eliminate the patterns holding you back',
      obj: 'Remove habits, distractions and environmental factors that prevent personal growth.',
      keys: ['Reduce brain-rot content and meaningless digital consumption.', 'Do a digital detox of at least 24 hours, from time to time.', 'Turn off unnecessary notifications.', 'Uninstall one highly distracting app for now.', 'Cut back on junk food and mindless scrolling.', 'Look honestly at draining environments and relationships. Context matters: nothing here tells you to end a relationship.', 'Practise self-control through challenges you can manage.'],
      daily: ['Complete a 24-hour digital detox.', 'Audit your daily smartphone usage.', 'Identify your three biggest distractions.', 'Organise your physical and digital environment.'],
      remind: "Time to go silent for 24 hours. Turn off notifications and remove one app that's draining your attention.", slot: 'morning', kind: 'A' },
    { n: 2, name: 'The Narrow Focus', tag: 'Commit to one primary mission',
      obj: 'Stop trying to build everything at once.',
      keys: ['Choose ONE primary mission for the next 30 to 90 days: Health, Wealth or Skill.', 'Add no more than two supporting missions.', 'Set measurable goals with deadlines.', 'Aim for 1 to 3 hours of deep work a day, adjusted to your life.', 'Avoid multitasking.', 'Review your results every week.'],
      daily: [],
      remind: "You can't build everything at once. Choose one primary mission and prove your commitment through action.", slot: 'morning', kind: 'I' },
    { n: 3, name: 'The Systems', tag: 'Replace intentions with repeatable systems',
      obj: 'Turn positive actions into consistent daily habits.',
      keys: ['A steady sleep and wake-up schedule.', 'A morning routine.', 'Deep work and learning sessions.', 'Regular exercise.', 'A daily priority list.', 'Journaling and an evening reflection.', 'Weekly planning.', 'Habit tracking.'],
      daily: [],
      remind: "Intentions aren't enough. Execute your small rituals today and finish at least one important task.", slot: 'afternoon', kind: 'A' },
    { n: 4, name: 'Energy Audit', tag: 'Find what builds you and what drains you',
      obj: 'Identify the activities that increase your energy and those that consume your mental capacity.',
      keys: ['List the activities that take most of your time.', 'Sort them into energy gainers and energy drainers.', 'Decide what to reduce or eliminate.', 'Decide what to do more often.'],
      daily: [],
      remind: 'Audit your energy today. What helps you grow, and what silently drains your mental strength?', slot: 'afternoon', kind: 'R' },
    { n: 5, name: 'The Reintroduction', tag: 'Build a new identity through execution',
      obj: 'Build a stronger identity through consistent behaviour rather than empty intentions.',
      keys: ['Consistency matters more than temporary intensity.', 'Build confidence through small achievements.', 'Rely less on outside validation.', 'Improve health, career, finances and thinking.', 'Document your progress.', 'Treat failures as a reason to adjust, not to quit.'],
      daily: [],
      remind: "Your new identity isn't built through words. Prove it through actions you consistently repeat.", slot: 'morning', kind: 'R' }
  ];

  var MISSIONS = {
    HEALTH: { t: 'Health', d: 'Improve physical fitness, mental well-being and energy.', eg: 'Run 5 km without stopping', unit: 'km' },
    WEALTH: { t: 'Wealth', d: 'Increase income, financial capacity and income streams.', eg: 'Earn a second income', unit: 'Rp' },
    SKILL: { t: 'Skill', d: 'Develop professional skills, expertise and a tangible portfolio.', eg: 'Finish and publish a portfolio project', unit: '%' }
  };

  /* Brutal 24-hour time audit (section 4B). g: waste, prod or rest. */
  var AUDIT = [
    { k: 'scroll', t: 'Social media scrolling', g: 'waste' },
    { k: 'idle', t: 'Resting or lying around without purpose', g: 'waste' },
    { k: 'worry', t: 'Complaining and overthinking', g: 'waste' },
    { k: 'work', t: 'Working or completing assignments', g: 'prod' },
    { k: 'learn', t: 'Learning and developing skills', g: 'prod' },
    { k: 'move', t: 'Exercise and physical activity', g: 'prod' },
    { k: 'sleep', t: 'Sleeping and resting', g: 'rest' }
  ];

  var DETOX = ['Disable non-essential notifications.', 'Uninstall or restrict one time-consuming app.', 'Avoid meaningless scrolling.', 'Replace digital distractions with productive activities.', 'Spend time reflecting without digital interruptions.'];
  var ENV = ['Organise the workspace.', 'Clean up laptop folders.', 'Organise documents and digital files.', 'Remove unnecessary conversations and digital clutter.', 'Prepare everything needed for tomorrow.'];
  var SLEEP = ['Keep a consistent bedtime.', 'Avoid unnecessary phone use before sleeping.', 'Aim for 7 to 9 hours of sleep.', 'Wake up at the planned time.', 'Start the day before distractions take over.'];

  var ENERGY = {
    gain: ['Activities that increase your enthusiasm.', 'Activities that stimulate your curiosity.', 'Activities that encourage personal growth.', 'Activities that leave you satisfied once done.'],
    drain: ['Activities that exhaust your mental energy.', 'Procrastination and avoidance.', 'Too much social media.', 'Unhealthy conflicts and interactions.', 'Activities without a meaningful purpose.'],
    ask: ['Which activities take most of your time?', 'Which activities make you feel energised?', 'What should you reduce or eliminate?', 'What should you do more often?']
  };

  /* Why a day went wrong (failure recovery protocol, step 2) and what to do about each. */
  var WHY = [
    { k: 'motivation', t: 'Low motivation', say: 'Motivation comes and goes. Do not wait for it: shrink the first step until it is easy, then start the timer.', fix: 'Do the smallest first step of the priority task within 10 minutes of waking.' },
    { k: 'schedule', t: 'Unrealistic schedule', say: 'That points to the plan, not to you. Cut the load and keep only what fits your real day.', fix: 'Keep only the four essentials tomorrow and stop at those.' },
    { k: 'fatigue', t: 'Fatigue', say: 'Tiredness is information. Protect sleep first, and keep tomorrow light.', fix: 'Go to bed at your set time and keep tomorrow a lighter day.' },
    { k: 'outside', t: 'Something outside my control', say: 'Some days are taken from you. Note it, and restart with one action rather than the whole system.', fix: 'Do one important task first thing, before anything else can interrupt.' }
  ];

  var REVIEW_Q = [
    'What was your biggest achievement this week?',
    'Which habits did you struggle to maintain?',
    'What was your biggest distraction?',
    'How many hours of deep work did you complete?',
    'Did you make progress toward your primary mission?',
    'What drained most of your energy?',
    'What should you stop doing next week?',
    'What are your three priorities for the upcoming week?'
  ];

  var PRINCIPLES = [
    ['Action over motivation', 'Action matters more than waiting for motivation.'],
    ['Systems over goals', 'Goals need consistent systems to become real.'],
    ['Discipline over comfort', 'Learn to accept discomfort you can handle.'],
    ['Progress over perfection', 'Small steady gains beat a perfect burst.'],
    ['Accountability over excuses', 'Look at what you did, honestly, without excuses.'],
    ['Focus over distraction', 'Point your attention and energy at what matters.'],
    ['Self-respect over validation', 'Build self-worth through actions and responsibility.']
  ];

  /* The reminder messages. kind: R reflective, I instructional, A accountability.
     c: any, low (yesterday was a hard day) or good (a steady run). Titles are the three modes of the prompt. */
  var TITLE = { morning: 'Execution', afternoon: 'Accountability', night: 'Reflection', review: 'Weekly review', detox: 'Detox' };
  var MSG = {
    morning: [
      ['m1', "Wake up. Don't let comfort control the direction of your life.", 'A', 'any'],
      ['m2', 'You have 24 hours. Set your priorities before your time disappears.', 'I', 'any'],
      ['m5', 'Your future starts with what you do this morning.', 'R', 'any'],
      ['m4', 'One completed task is worth more than ten unfinished plans.', 'A', 'any'],
      ['m3', "Don't check your phone yet. Complete your morning ritual first.", 'I', 'any'],
      ['m12', "Today's standard: keep the promises you made to yourself.", 'A', 'any'],
      ['m6', "Write down today's one priority task before you open anything else.", 'I', 'any'],
      ['m11', 'Before the feed and the news: one priority, one first step.', 'I', 'any'],
      ['m7', 'Walk for 10 minutes before the day gets loud. Start small, then build.', 'I', 'any'],
      ['m8', 'Yesterday is done. Pick one action that moves your mission today.', 'R', 'low'],
      ['m9', 'Keep it small today. Wake on schedule and take the first step.', 'I', 'low'],
      ['m13', 'A reset starts with one small win. Do the first step of your priority task.', 'I', 'low'],
      ['m10', 'Good run lately. Protect it: same wake time, same first move.', 'A', 'good'],
      ['m15', 'Your system is working. Keep the morning routine exactly the same.', 'A', 'good'],
      ['m16', 'Steady days add up. Start with the same first step as yesterday.', 'I', 'good']
    ],
    afternoon: [
      ['a1', 'Audit your focus. Are you building your future or avoiding responsibility?', 'R', 'any'],
      ['a2', 'Stop postponing. Complete your most important task now.', 'A', 'any'],
      ['a3', "Organize your environment. Don't let unnecessary chaos drain your energy.", 'I', 'any'],
      ['a5', 'Check your progress. Are your actions aligned with your primary mission?', 'R', 'any'],
      ['a7', 'Phone away, timer on. Give your deep work 25 focused minutes.', 'I', 'any'],
      ['a13', 'What did you avoid today? Do the first two minutes of it now.', 'A', 'any'],
      ['a6', 'Half the day is gone. What is the one thing you still owe yourself today?', 'R', 'any'],
      ['a10', 'Look at your list. Cross off one thing in the next 30 minutes.', 'I', 'any'],
      ['a11', 'Close extra tabs and mute alerts. One task, full attention.', 'I', 'any'],
      ['a12', 'Energy dipping? Stand up, drink some water, then take the next small step.', 'I', 'any'],
      ['a4', "It's not too late to fix today. Start with one meaningful action.", 'A', 'low'],
      ['a8', 'Behind today? Shrink the task and start. Ten minutes counts.', 'I', 'low'],
      ['a14', 'Rescue the day with 20 minutes on your most important task.', 'A', 'low'],
      ['a9', 'Strong day so far. Finish the priority task before you relax.', 'A', 'good'],
      ['a16', 'Consistency is showing. Finish your deep work and protect your evening.', 'I', 'good'],
      ['a17', 'Good pace. What is the next thing that moves your mission?', 'R', 'good']
    ],
    night: [
      ['n1', 'Review today. What did you actually accomplish?', 'R', 'any'],
      ['n3', "Prepare tomorrow's three priorities before going to sleep.", 'I', 'any'],
      ['n2', 'Be honest with yourself. How much time did you waste today?', 'R', 'any'],
      ['n6', 'Put the phone down 30 minutes before bed. Your morning starts tonight.', 'I', 'any'],
      ['n4', "Rest isn't weakness. Quality sleep is part of discipline.", 'R', 'any'],
      ['n7', "Tick off today's rituals and note one win, however small.", 'I', 'any'],
      ['n11', 'Name one thing you did well today. Then name one thing to adjust.', 'R', 'any'],
      ['n8', 'Lay out what you need for tomorrow, then wind down.', 'I', 'any'],
      ['n12', 'Screens off soon. Set tomorrow\'s alarm and keep the phone away from your bed.', 'I', 'any'],
      ['n5', 'Tomorrow is another opportunity. Learn from today and prepare better.', 'R', 'low'],
      ['n9', "A missed day is a setback, not an identity. Plan tomorrow's first step.", 'R', 'low'],
      ['n13', 'Tough day? Write one lesson from it and one first step for tomorrow.', 'R', 'low'],
      ['n10', 'Steady days build the new you. Close the day and rest well.', 'R', 'good'],
      ['n15', 'A steady day. Note what worked so you can repeat it tomorrow.', 'R', 'good'],
      ['n16', 'Good work today. Plan tomorrow in two minutes, then rest.', 'I', 'good']
    ]
  };
  var REVIEW_MSG = 'Weekly review time. Eight honest questions, about five minutes.';
  var DETOX_MSG = 'Your detox time is up. Write down what you noticed before you open anything.';

  return { RITUALS: RITUALS, LIGHT: LIGHT, BANDS: BANDS, PHASES: PHASES, MISSIONS: MISSIONS, AUDIT: AUDIT, DETOX: DETOX, ENV: ENV, SLEEP: SLEEP,
    ENERGY: ENERGY, WHY: WHY, REVIEW_Q: REVIEW_Q, PRINCIPLES: PRINCIPLES, TITLE: TITLE, MSG: MSG, REVIEW_MSG: REVIEW_MSG, DETOX_MSG: DETOX_MSG };
})();
