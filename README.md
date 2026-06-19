# ⛏️ MineHealth — The Gamified Life OS

[![Status](https://img.shields.io/badge/Status-Public%20Showcase-brightgreen)](https://github.com/Stormynubee/MineHealth-Showcase)
[![Tech Stack](https://img.shields.io/badge/Stack-React%20%7C%20FastAPI%20%7C%20MongoDB-blue)](https://github.com/Stormynubee/MineHealth-Showcase)
[![AI Powered](https://img.shields.io/badge/AI-Gemini%202.5%20Flash-orange)](https://github.com/Stormynubee/MineHealth-Showcase)

MineHealth is a highly customized, personal Life OS dashboard that gamifies productivity, health, and education through a Minecraft-themed interface. This repository is a showcase of a state-of-the-art **Agentic Workflow**, representing months of collaboration between a human developer and multiple Tier-1 AI systems.

---

## 🌟 Key Features

- **🛡️ Minecraft Aesthetic:** A pixel-perfect, gamified UI with custom buttons, XP bars, and Minecraft-themed design elements.
- **🤖 Blocky AI Buddy:** A Gemini-powered AI companion with a distinct Minecraft personality, helping with JEE doubts, meal checks, and productivity suggestions.
- **📚 JEE Mastery Tracker:** Comprehensive tracking for Physics, Chemistry, and Maths (83 chapters), integrated with progress visualization.
- **🏥 Health & Habit System:** Gamified tracking for strict health regimens, medication reminders, and a secure skin-condition journal with photo logs.
- **⏰ Morning Alarm & Goals:** A full-screen, IST-scheduled wake-up system with 8-bit synthesized sound, AI-powered morning briefs, and automated daily goal setting.
- **📊 Focus & Analytics:** Integrated Pomodoro timer with distraction tracking and automated XP penalties.
- **📱 PWA with Background Notifications:** System-level hydration reminders and medication alerts that work even when the app is closed.

---

## 🧠 The "Agentic Workflow" (Project Lineage)

This project isn't just a dashboard; it's a testament to the power of human-AI collaboration. It was built through 12 distinct phases of development involving multiple AI models:

- **Phases 1-4:** Core architecture and initial features using **Claude 3 Opus** and **Gemini 1.5 Pro**.
- **Phase 5 (The "Thinking" Audit):** A deep audit using **Claude 4.6 Thinking** to resolve latent architectural gaps and cold-start resilience issues.
- **Phases 6-8:** Implementation of complex mobile UI, background service worker notifications, and the Morning Alarm system by **Antigravity**.
- **Phases 10-12:** Hardening AI stability, anti-hallucination logic, and building the Secure Journal system.

---

## 🛠️ Technical Architecture

### **Monorepo Structure**
- **`/frontend`**: React 18 application using custom pixel-art CSS and Shadcn/UI components.
- **`/backend`**: High-performance FastAPI server managing AI logic and MongoDB persistence.
- **`/api`**: Vercel Serverless bridge for seamless deployment.

### **AI Core (Google Gemini)**
- **Gemini 2.5 Flash**: Primary intelligence for Blocky's chat and advice.
- **Gemini 1.5 Flash**: Lightning-fast utility endpoints for tips and skin analysis.
- **Custom Anti-Hallucination Layer**: Advanced prompt engineering and dynamic model fallback to ensure consistent, reliable AI responses.

---

## 🚀 Technical Handover & War Room

*Below is the detailed technical history and handover documentation, showcasing every bug fixed and optimization applied during the project's lifecycle.*

---

## 1. Project Context
MineHealth was built as a personal Life OS specifically for a student's daily routine. It integrates JEE preparation, health management, and career building into a single unified experience.

**Tracking Metrics:**
- **JEE Prep:** Physics, Chemistry, Maths (Class 11 & 12).
- **Health:** Medication timing, skin condition severity logs, and strict dietary rules (No Sugar, No Oil).
- **Habits:** Meditation (Wim Hof, Yoga Nidra), Huberman Sunlight, and hydration.
- **Career:** Coding (ESP32, Robotics), content creation, and freelance management.

---

## 2. Critical Fixes & Hardening

> [!IMPORTANT]
> **Namespace Conflict Resolution**
> We discovered a critical namespace collision between `google-genai` (1.x) and Vercel's Python runtime. The project is **pinned to `google-generativeai==0.8.3`** to ensure 100% production stability.

### **Architectural Hardening:**
1. **Stateless AI Memory:** Refactored chat to fetch history from MongoDB on every request, ensuring persistent personality in serverless environments.
2. **Lifespan Initialization:** Initialized the database client strictly within the FastAPI lifespan context to prevent event loop crashes.
3. **Transparent Error JSON:** Backend returns 200 OK with error tracebacks to bypass Vercel's silent 500s, enabling rapid debugging.
4. **Session Sanitization:** Automated cleanup of orphaned user messages to prevent conversational history corruption.

---

## 3. Known Bugs Fixed (The Audit Log)

| # | Bug | Root Cause | Fix Applied | Agent |
|---|---|---|---|---|
| 1-3 | Build & Config Errors | Environment desync | Absolute to relative paths; env fallbacks | Claude |
| 4-8 | AI & DB Crashes | Statelessness/Lifespan | Reactor loop refactor; Transparent 200s | Gemini |
| 9-13 | Session Corruption | Orphaned messages | `_sanitize_history()` implementation | Opus |
| 14-16 | Cold-Start Crashes | Unhandled promises | try/catch + toast + 30s timeouts | Opus Thinking |
| 17-19 | Mobile UI & PWA | Desktop-first CSS | Hamburger menu; SW Background Notifications | Antigravity |
| 20-22 | AI Hallucinations | Reasoning leakage | JSON-only system prompts; 3-strategy regex extraction | Antigravity |

---

## 4. API & Route Reference

### **Primary Endpoints**
- `POST /api/ai/chat`: Interactive chat with Blocky (Gemini 2.5 Flash).
- `GET /api/dashboard/summary`: Comprehensive aggregation of all Life OS stats.
- `GET /api/jee/syllabus`: Real-time tracking of JEE chapter completion.
- `POST /api/journal/auth`: Secure session-based authentication for the personal vault.

---

## 5. Deployment Info
- **Platform:** Vercel (Python Serverless + React static)
- **Database:** MongoDB Atlas
- **AI Engine:** Google AI Studio (Gemini)

---

*This project is a living example of how AI can be leveraged not just to write code, but to architect, audit, and maintain complex personal software systems. Every line of code, every pixel, and every bug fix represents a high-signal collaboration.*

---

*Handover Version: `1.0.7-secure-journal` | Last Updated: April 22, 2026 | Total Phases: 12*

