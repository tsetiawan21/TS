# TS: six apps in one APK

**Today** (daily scorecard across everything), **Coach** (analysis of your own data), **Goals** (MBA study planner, **Learning Path**, timer, stats), **Trading** (routine tracker), **Berserker** (training), **Forge** (life reset and daily discipline). Everything works offline and keeps its data on your phone. Strictly black, white and grey.

## What is new in version 2.3: Forge follows your work shifts
Forge now plans around your two kinds of shift (morning shift: morning till evening, afternoon shift: afternoon till night) and your days off. **You plan the shifts once, in Goals > Planner; Forge reads them** and never changes them. Nothing in the other apps is changed.

- **One shift calendar.** For each day Forge uses the shift you planned in Goals. If Goals has nothing for a day, Today asks "Which shift is today?" and **Settings > Your next 7 days** lets you fill in the week. A shift planned in Goals always wins, so there is one place to change it (Forge has a button that opens the Goals planner). A day with no shift at all is treated like a day off.
- **Wake and bed time for each kind of day.** **Settings > Work shifts** holds a wake time and a bedtime for the morning shift, the afternoon shift and a day off. Forge suggests times from the shift hours in Goals (08:50 to 16:30 and 14:20 to 22:00 unless you changed them): wake 06:00 and bed 22:30 for the morning shift, wake 07:00 and bed 23:30 for the afternoon shift. Change any of them; **Use the suggested times** brings the suggestions back. On a work day the bedtime is never earlier than 45 minutes after the shift ends. The wake ritual is judged against the wake time of that day.
- **Reminders that fit the day.** Nothing while you sleep and nothing from 30 minutes before a shift until 30 minutes after it. Morning shift: morning reminder 30 minutes after you wake ("before work"), afternoon reminder 30 minutes after the shift ("after work"), night reminder 90 minutes before bed. Afternoon shift: a free-morning reminder, one 90 minutes before the shift, and a night reminder after work. Days off keep the times you chose. The weekly review moves out of work hours (or is skipped if that would be too close to bed) and replaces the night reminder when the two would be less than 30 minutes apart. Titles carry a short tag such as "after work". The next seven days are planned again every time you open Forge **and when a shift changes in Goals**.
- **Sleep that matches the shift.** Today shows the wake time, tonight's bedtime and the sleep planned, and says plainly when a night is short (under 7 hours), for example an afternoon shift followed by a morning shift. Settings lists the short nights in your pattern so you can move a time.
- **Deep work around the shift.** Today lists the free windows for deep work (before work and after work, leaving Goals' buffer for getting ready and the trip). Settings can give days off a bigger deep work goal.
- **Numbers by kind of day.** Stats and the weekly review show average completion on morning shift days, afternoon shift days and days off, and Forge's tips can point out when one kind of day is clearly weaker. The brief for Claude now includes your shifts, the next seven days and these averages.
- **Same every day.** Prefer the old way? Switch **Settings > Work shifts** to "Same every day": one wake time, one bedtime and fixed reminder times, exactly as in 2.2.

Assumptions: "morning shift" and "afternoon shift" use the shift hours from Goals; Forge never edits them. The suggested wake and bed times are starting points, not medical advice. Tested in a desktop browser (every screen, light and dark, 320 to 390 px wide, a fake notification plugin, shifts changed in Goals while Forge was open). It has not been run on a real Android phone: after installing, use **Settings > Send a test reminder** and check that one reminder arrives on a shift day.

## What is new in version 2.2: Forge
**Forge** is the sixth item in the bottom bar. It is the Forge Protocol (life reset, self-mastery and daily discipline) built as an app that works offline. Nothing in the other apps is changed or reset.

Assumptions worth knowing: Forge was added as its own bottom-bar item, not as a tab inside Goals. The app has no live AI inside it, so the coaching is rule-based (your own numbers and the protocol's rules); for deeper coaching it builds a **brief** you copy into a chat with Claude (see below). To move it into Goals instead, say so.

- **Today**: a score for the day, the message for the part of the day (morning, afternoon, night), seven daily rituals, three priorities (today, or tomorrow written the night before), a short log (sleep, minutes of deep work and learning, screen time, training) and a two-line evening review.
- **Scoring**: seven rituals (wake on schedule, no phone for the first hour, a 10-minute walk, one priority task, a deep work session, learning, review your day). Score bands: 0-39 Reset Required, 40-59 Inconsistent, 60-79 Improving, 80-94 Consistent, 95-100 Optimal Execution. A streak day is 60% or more. The weekly and monthly figures end yesterday, so a day still in progress never drags them down, and days before you started tracking are left out, not counted as zero.
- **Honest auto-ticks.** Some rituals tick themselves only from real data: deep work and learning from your Goals study time plus the minutes you log (learning counts from 10 minutes; Settings decides whether Goals study counts as deep work), the priority ritual when you tick one of your written priorities, wake on schedule from your sleep log (within 15 minutes of your target), review from the evening note, and training from Berserker. Automatic rows show an "Auto" tag and cannot be un-ticked by hand.
- **Light day**: one tap on a heavy day keeps four essentials (walk, priority, deep work, review) and halves the deep work goal. The goal is to keep the habit, not to go all-out.
- **Failure recovery**: when yesterday was under 60%, Today asks what got in the way (low motivation, unrealistic schedule, fatigue, something outside your control), answers with a calm message, offers a light day and gives one corrective action. It never shames you.
- **Reset tab**: the five phases (The Cleanse, The Narrow Focus, The Systems, Energy Audit, The Reintroduction) with key actions and the phase's reminder, a digital detox timer (12, 24 or 48 hours, one alert at the end), the brutal 24-hour time audit with history, your three biggest distractions, the environmental reset and sleep reset checklists, the energy audit (gainers and drainers) and the seven principles.
- **Mission tab**: one primary mission (health, wealth or skill) with a measurable target and a deadline, up to two supporting missions, progress against the time used (On track, Behind, Done), deep work on the mission, and your three priorities for the week.
- **Stats tab**: the protocol's ten figures: weekly performance, monthly progress, and eight tiles (daily completion, streak, deep work, learning, training, screen time, sleep consistency, primary mission), plus a 7-day bar chart, a 30-day heat map, habits that are slipping, the main obstacles and three corrective actions.
- **Review tab (weekly)**: the performance summary, the habit report, the energy audit, mission progress, three improvement actions and the eight questions, each with the matching numbers beside it. Saving it turns your answer to question 8 into next week's three priorities. A reminder appears on your review day, once the last review is six days old.
- **Reminders** (Android app): morning (Execution), afternoon (Accountability) and night (Reflection), each at most 120 characters with its title. At most three a day plus the weekly review, none between your bedtime and wake time, optionally weekdays only. Nothing is sent for something you already did that day: no morning reminder once you started, no afternoon reminder once the priority and deep work are done, no night reminder once the review is done. The next seven days are planned again every time you open Forge, so **open it at least once a week**. Forge's reminders use notification ids 700000 to 709999 and only ever cancel its own; Goals' clean-up was changed to leave that block alone. **Settings > Send a test reminder** confirms they arrive. Forge asks for notification permission when you open it, never while it loads in the background.
- **Ask Claude to coach you**: Forge copies a brief with the full Forge Protocol prompt plus your real numbers (last 7 and 30 days, rituals, sleep, mission, review answers) to paste into a chat with Claude. Nothing leaves the phone unless you send it.
- **Your data**: stored under `forge.v1`, included in **Today > Export backup** and restored with it. **Settings** can restart the numbers from today (logs are kept) or erase all Forge data (both ask twice). Forge is a coaching tool, not medical advice.

Tested in a desktop browser (every screen, light and dark, at 320, 360 and 390 px wide, with a fake notification plugin for the reminders). It has not been run on a real Android phone yet: after the first install, use the test reminder and check one morning reminder arrives.

Other fixes in 2.2: the toast message in Goals is now styled (it used to appear as plain text at the bottom of the screen), and the bottom bar fits six items down to 320 px wide.

## What is new in version 2.1: the Learning Path
**Goals > Learn** is a personal learning tracker with exactly eight categories and 323 lessons. Nothing you already have is changed: every existing lesson, completed lesson, study session, shift, setting and review date stays exactly as it was, and nothing is reset, deleted or duplicated.

| Category | Lessons | What it covers |
|---|---|---|
| Financial & Business Education | 77 | 18 subjects. 28 of your existing finance, business and strategy lessons are shown here with their progress kept, plus 49 new ones: personal finance, budgeting and debt, tax, investing, portfolios, company valuation, corporate finance, business models and wealth building, with Indonesian examples |
| Economics | 33 | Supply and demand, money, banks, inflation, growth, trade, inequality, development. Lessons where economists disagree say so |
| Philosophy | 30 | Greek, Indian, Chinese, ethics, logic, existentialism, Stoicism |
| Body Language | 30 | What research shows about nonverbal communication. Each lesson has an "Evidence and limits" note. Cues are signals, not mind reading |
| Art History | 36 | From cave art to contemporary art. Each lesson has "Look at these first" links to Wikimedia Commons image search, so you can see the works (needs internet) |
| Geopolitics | 39 | Facts, interpretations and predictions are labelled separately in every lesson. Use current, reliable sources for anything recent |
| Culinary Basics | 39 | Practical kitchen skills; every lesson ends with something to cook or practise |
| Psychology | 39 | Established findings versus theories versus popular myths. Education only, never diagnosis |

Each category has Beginner, Intermediate and Advanced levels. Each lesson shows its length and difficulty, learning objectives, an exercise, a 3-question check and resources.

- **Completion and mastery are separate.** A lesson is complete when you have studied its full time, or at least half of it and ticked the exercise (then tap Complete lesson), or passed the 3-question check (2 of 3). Opening a lesson never completes it. Mastery is tracked on its own: Not checked, Learning, Proficient, Mastered (two passes at least 7 days apart).
- **Level checkpoints** unlock at 60% of a level: a 6-question quiz, pass at 4.
- **Dashboard**: progress for each category, lessons completed and remaining, estimated weeks to finish, study time this week and in total, days in a row, active days in the last 4 weeks, hours by category, what is next in your plan, revisions due and milestones.
- **A weekly schedule across all eight categories.** Set the weekly learning time in **Learn > Week** (default 3h, from Off to 8h). It is added on top of your MBA study and your shifts, never over them. Each session is about one lesson, the planner picks the category you studied least recently, alternates reading with practical subjects, serves lessons you already started first, and adds one revision session a week (two if many are due). Existing roadmap lessons keep their normal schedule.
- **Missed sessions.** If a planned session did not happen, a gentle card offers a new time in your free hours. Accept it and that slot is reserved, or skip it. Nothing is lost from your history.
- **Reminders** (Android app, at most 3 a day, each kind can be switched off in Learn > Week): shortly before a session, when it starts, unfinished lessons once a week, an evening check-in that also covers a missed session, a weekly summary on Sunday evening, and milestones (each announced once).
- Today and Coach count learning time toward your weekly goal, and Coach reports on all eight categories.

## What is new in version 2
- **Today** is a real dashboard: a three-segment ring (study, training, trading), progress bars on each habit, a live "study session running" card that opens the timer, a This week summary, a 12-week consistency heatmap (tap any day for details), and a one-line daily note.
- **Bottom bar**: a sliding indicator, a badge on Today showing how many habits are still open, light haptic taps, and screens that always show fresh data when you switch to them (Coach and Today used to show stale numbers until reopened).
- **Coach > Trends**: study hours per week against your goal, your strongest weekday, the time of day you study most, how steady each habit has been over 28 days, and a weekly understanding trend.
- **Goals**: log a past study session by hand (forgot to start the timer), the timer now finishes on time even while you are on another tab and never logs more than the target, the screen stays on during a running session, and a vibration marks start and finish.
- **Safer backups**: Restore rolls back automatically if it fails halfway, and rejects files that are not TS backups.
- **Build**: the workflow checks the code for mistakes before the slow Android build, caches Gradle, skips builds for README edits, and stamps the build number at the bottom of Today so you can tell which version is installed.

## Build the APK (about 10 minutes, once)
1. Create a **private** repository on github.com. Keep it private: `debug.keystore` is inside.
2. Upload everything from this folder, including the hidden `.github` folder. Commit to `main`.
3. Open the **Actions** tab. The **Build APK** workflow runs by itself; wait for the green check.
4. Open the **Releases** page of the repository and download `TS.apk` on your phone, then install it (allow "install unknown apps" for your browser when asked).

Every later push builds a new APK. Install it over the old one: your data stays, because every build is signed with the same key and has a higher version number.

## First launch checklist
- Allow notifications when asked. In **Today > Backup and tools** tap **Test notification** to confirm it works.
- On Xiaomi, Oppo, Vivo or Samsung phones, set TS to "No restrictions" under battery settings, or reminders may arrive late.
- Open **Goals > Planner**, enter your shift hours, then pick Morning, Afternoon or Off for each day (Forge reads these too, so its reminders avoid your work hours). Tap any study block to see the exact lesson, what to learn, what to practise, how to split the minutes, and when you are done. **Syllabus** lists all lessons; edit `www/apps/goals/curriculum.js` to change them.

## Coach tab (analysis on your own data)
Runs on the phone, no internet, nothing sent anywhere. **Review**: weekly scorecard across study, training and trading, plus ranked findings (pace, neglected subjects, low understanding, best time of day, training vs study, rule adherence, costliest mistake). **Trends**: 12-week rhythm (see above). **Lab**: expectancy, profit factor, drawdown, equity curve, results by setup, session and instrument, discipline analysis, a Monte Carlo risk simulation on your own trades, and your demo gate checked against your journal. **Forecast**: whether each subject will finish before its roadmap deadline at your pace. **Claude**: builds a numbers-only report you can share into a Claude chat for deeper analysis.

## Spaced repetition (in Goals)
After each lesson session your understanding rating schedules a review: low means tomorrow, high pushes it out (1, 3, 7, 16, 35, 70 days). Due reviews appear at the start of your next study blocks with Remembered and Forgot buttons.

## Trading track (optional, in Goals)
Open **Goals > Planner** and set **Trading track** to 2h, 3h or 5h per week (Off by default). It adds study blocks and raises your weekly goal. 39 lessons in 6 modules, about 77 hours, from reality check and small-account maths to risk, writing one setup as exact rules, backtests, a journal routine, and demo-to-live gates. Home shows lessons done, weeks on target in a row, and your Trading tab journal (closed trades, rules followed). This is education, not financial advice. Most retail traders lose money, and no lesson guarantees profit.

## Backups (important)
Data lives only in the app. Uninstalling or clearing app storage deletes it. Use **Today > Export backup** and save the file to Drive or email it to yourself. **Restore** loads such a file. Today reminds you when your last backup is a week old.

## Notes
- Android back button: returns to Today first, and only exits from Today.
- Berserker dates now use your phone's local day (previously UTC, which shifted workouts before 08:00 in UTC+8).
- Study counts as done on Today at 60 minutes by default; change it in Today > Settings. Haptics can be switched off there too.
- Lessons for the eight categories live in `www/apps/goals/learn/`, one file per category. Lesson ids are saved in your data, so only add new lessons at the end of a category's list, and never reorder or remove existing ones. `node scripts/check.mjs` checks this against `scripts/lesson-ids.json`; after adding lessons, run `node scripts/check.mjs --write-ids` and commit the updated file.
- Forge lives in `www/apps/forge/`: `data.js` (all protocol text: rituals, phases, messages), `prompt.js` (the master prompt for the brief), `core.js` (scoring, plan and reminder rules, no screen code), `ui.js` plus `v-today.js`, `v-reset.js`, `v-stats.js`, `v-setup.js` (screens) and `boot.js`. Its data key is `forge.v1`. The reminder rules are in `FG.plan` in `core.js`; the shift rules (which shift a day has, wake and bed times for each kind of day, free windows) sit above it and only read `futuregoals.v1`. `node scripts/check.mjs` also checks the hub bar, the reminder id block and the 120-character limit.
- Shared code lives in `www/shared/` (`ts.js` reads all data and computes the daily facts, `ts.css` holds the design tokens). `scripts/check.mjs` is the pre-build check; run `node scripts/check.mjs` on a computer to test before you push.
- Rename the app in `capacitor.config.json` (`appName`). Do not change `appId` after installing, or Android treats it as a different app.
- This is a debug-signed build for personal use, not a Play Store release.
