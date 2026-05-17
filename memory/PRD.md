# LIFE BLOCKS — Product Requirements (Living Doc)

## Original problem statement (user)
18-year-old JEE aspirant with severe health condition wants a **Minecraft-themed gamified life dashboard** to unify: study to-do (with XP bar), Pomodoro, JEE syllabus tracker (Physics/Chem/Maths 11-12), coding & robotics goals, health zone (medicine reminders for health condition, skin issue/no-sugar/no-oil/meditation log, habits like yoga nidra, Wim Hof, Huberman), meditation timer, academic progress graphs, creative tools, and a career section (LinkedIn, IIT/NIT/techfest/research programs, daily video edits, daily clients). Website dashboard. "Aesthetic, elegant, indie wherever wanted." AI buddy to nudge & suggest new techniques.

## Architecture
- **Backend**: FastAPI + MongoDB (Motor), all routes under `/api`. Single user (`player_one`). XP/level/streak in `profile`. Collections: tasks, jee_progress, pomodoro, habits, meds, meds_taken, skin issue_log, meditation, career, chat_messages, daily_tip.
- **AI**: Claude Sonnet 4.5 via `emergentintegrations.llm.chat` using `EMERGENT_LLM_KEY`.
- **Frontend**: React 19 + Tailwind + Shadcn + Recharts + Lucide. Fonts: Silkscreen (pixel), VT323 (NPC dialog), JetBrains Mono (body). Custom neo-brutalist block cards with 4px offset shadows. Dark slate base with Minecraft accent palette (grass green XP, gold, diamond blue, redstone red).

## User persona
Single-player mode. No login. Teen JEE aspirant + creator + robotics hobbyist + health condition patient.

## Core features (shipped)
- **Base Camp / Dashboard** — header with level, streak, XP bar; daily Blocky AI tip; quick quests + pomodoro + today's score + quick jumps.
- **Study Quest** — JEE syllabus (83 chapters) with checkbox completion (+50 XP each), study quests CRUD, Pomodoro, 7-day focus bar chart, subject breakdown.
- **Code & Bots** — coding + robotics goal CRUD with notes, idea-drop pane.
- **Health Zone** — 10 daily habits toggle, health condition meds reminders with time, daily taken-checkbox, skin issue log (severity 1-5 + rules no_sugar/no_oil/meditation), food-buddy dialogue box, 7-day habit chart.
- **Meditate** — 5/10/15/20/30 min pixel timer + Wim Hof guide + Yoga Nidra + NSDR preset + total/sessions stats.
- **Career Hub** — LinkedIn profile link save/open, log video edits/clients/programs/research entries, totals card, 12 curated programs (IIT Bombay Techfest, Shaastra, Cognizance, Exodia, SRFP, INSPIRE, Technozion, Robocon India, SIH, GSoC, MIT PRIMES, IIT-B RIP).
- **Blocky AI** — persistent chat with Claude Sonnet 4.5, NPC dialogue box style, 6 quick-ask prompts (JEE, meal check, Huberman, LinkedIn caption, etc.).
- **Creative** — creative quests CRUD, flashcards with flip animation (localStorage), auto-saved scratch notepad.

## Implementation log
- 2026-02 (iter 1): MVP shipped. 33/33 backend tests green. Live Claude 4.5 AI tested and working.
- 2026-02 (iter 2): Polish + website — public landing page `/`, shareable public profile `/profile`, 13 Minecraft-themed achievements, browser notifications for meds & food buddy, Recent Unlocks card on dashboard, XP clamp ≥0. 18/18 new backend tests green.
- 2026-02 (iter 3): PWA (manifest, service worker, icons, Install prompt banner) + four personal features — JEE Countdown tile (Main & Advanced 2027), Boss Fight (pin one task for 2× XP), AI Weekly LinkedIn Recap generator, AI Skin Pattern Analysis (14-day skin issue log + habit correlation via Claude). is_boss exposed in /api/tasks response. 17/17 new backend tests green.
- 2026-02 (iter 4): 8-item polish — MarkdownText renderer (kills literal **asterisks** from AI), user-select:none + caret fix (no cursor blink on clicks), clean pixel-block logo pill + removed text-shadow blur on titles, Pomodoro custom minutes input, Code & Bots year/status/link fields + archive section, JEE syllabus upgrade to per-chapter mastery (Weak/Medium/Mastered) + notes textarea + revision counter + mastery map chart, Pixel Cat companion walking across screen (click → Blocky AI tip), Minecraft splash screen with block-drop intro. 15/15 new backend tests green. Idempotent mastered XP (+30 once only).

## Deferred / P1 backlog
- Real push notifications (browser Notification API) for medicine time & food buddy reminders.
- Daily streak persistence with calendar view.
- Multi-user auth (JWT or Emergent Google Auth) if user wants cross-device sync.
- Shareable progress snapshots (public /u/player_one page with achievements).
- Calendar view of study/health/career across months.
- Clamp `total_xp >= 0` on task un-toggle (minor test-agent note).
- Split `server.py` into routers if >800 lines.
- Export data (JSON/CSV) & import backup.
- Theme switcher (biome themes: forest, nether, end).

## P2 nice-to-haves
- Mobile PWA install.
- Pet companion (Minecraft wolf) that evolves with streak.
- Achievements / badges (Diamond Student, Obsidian Focus, Emerald Streak).
- Leaderboard among friends.
- Voice-based Blocky (OpenAI TTS).
