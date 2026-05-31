# Visualize — Storm Damage Lead Generation Engine

> **Private AI-powered lead generation and acceleration system for hail restoration contractors.**
> Targeting homeowners in Naperville, Willow Springs, Sag Bridge, and Palisades, IL affected by the March 10, 2026 hail event.

---

## Mission

Visualize is a **Next Action Engine** — not a traditional CRM. Its sole purpose is to generate, prioritize, manage, and convert hail restoration inspection opportunities into signed construction contracts. The system continuously identifies the highest-return next action to maximize signed contracts while minimizing wasted effort.

---

## Core Philosophy

Every lead must always have:

| Requirement | Implementation |
|---|---|
| A Score | Weighted 0–100 based on scoring model |
| A Status | `new` → `contacted` → `appointment_set` → `inspected` → `contracted` / `lost` |
| A Next Action | Specific, actionable instruction (never vague) |
| A Next Action Deadline | Date/time by which the action must be completed |

**No lead should ever sit idle.** If a lead has no next action, the system has failed.

---

## The Storm Event

### March 10, 2026 — NWS Chicago Verified

| City | County | Confirmed Hail Size | Comparison | Properties Impacted | Storm Time |
|---|---|---|---|---|---|
| Naperville | DuPage / Will | 1.00"–1.25" | Quarter to Half-Dollar | ~106 | 5:40–6:15 PM CDT |
| Willow Springs | Cook | 1.00"–1.50" | Quarter to Ping-Pong Ball | ~85 | 5:50–6:20 PM CDT |
| Sag Bridge | Cook / Will | 1.00"–1.25" | Quarter to Half-Dollar | ~62 | 5:45–6:10 PM CDT |
| Palisades | Cook | 1.00"–1.25" | Quarter to Half-Dollar | ~48 | 5:50–6:15 PM CDT |

**Source:** [NWS Chicago — March 10, 2026 Severe Weather Summary](https://www.weather.gov/lot/2026_03_10_Severe_Weather)

**Insurance Claim Deadline:** March 10, 2027 (Illinois carriers allow 1 year from date of loss)

### Key NWS Quote

> "During the afternoon and evening of March 10, 2026, several intense supercell thunderstorms moved across northern Illinois... Another supercell moved across the southern and western Chicago metropolitan area and dropped hail ranging in size from 2 to locally 4 inches in diameter across Bolingbrook, Woodridge, Downers Grove, Westmont, and Darien."

### Hail Size Damage Reference

| Size | Comparison | Damage Level |
|---|---|---|
| 0.75" | Penny | Cosmetic marks on soft metals |
| 1.00" | Quarter | Granule loss begins on asphalt shingles |
| 1.25" | Half Dollar | Significant granule loss, shingle bruising |
| 1.50" | Ping Pong Ball | Shingle cracking, dents in gutters & vents |
| 1.75" | Golf Ball | Structural shingle damage, underlayment impact |
| 2.50" | Tennis Ball | Severe structural damage, possible deck penetration |

---

## KPI Targets

| Metric | Target | Calculation |
|---|---|---|
| Monthly Contracts | 40 | Primary KPI |
| Close Rate | 40% | Inspections → Contracts |
| Inspections Needed | 100/month | 40 ÷ 0.40 |
| Daily Inspections | 5/day | 100 ÷ 20 working days |
| Avg Contract Value | $12,500 | Revenue per signed contract |
| Monthly Revenue | $500,000 | 40 × $12,500 |

---

## Lead Scoring Model (0–100)

| Factor | Points | Rationale |
|---|---|---|
| Property in confirmed March 10 hail zone | 25 | Highest-value indicator — NWS confirmed |
| Address verified against hail swath | 20 | Property-level geocoding confirmation |
| No contractor selected yet | 20 | Open opportunity — no competitor |
| No insurance claim filed yet | 15 | We guide the entire process |
| Insurance claim already filed | 10 | Motivated — needs contractor now |
| QR code scanned (postcard/door hanger) | 10 | High-intent engagement signal |
| Roof estimated 10+ years old | 10 | Higher damage probability |
| 30+ square roof | 10 | Higher contract value |
| Owner occupied | 5 | More likely to invest |
| Responded within 24h | 5 | Urgency signal |

**Score capped at 100.** Tiers:

| Tier | Score | Priority | Action Cadence |
|---|---|---|---|
| 🔥 Hot | 70–100 | Immediate | Contact within 2 hours |
| ⚡ Warm | 40–69 | High | Contact within 24 hours |
| 📋 Cool | 20–39 | Standard | Contact within 48 hours |
| ❄️ Cold | 0–19 | Low | Drip campaign, re-score after 7 days |

---

## Platform Architecture

### Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 19 + TypeScript | Mobile-first UI |
| Styling | Tailwind CSS 4 + shadcn/ui | Design system |
| Routing | Wouter | Client-side routing |
| API | tRPC 11 | End-to-end type-safe API |
| Backend | Express 4 + Node.js | Server logic |
| Database | MySQL (TiDB) + Drizzle ORM | Relational data |
| Auth | Manus OAuth | Admin authentication |
| AI/LLM | Built-in invokeLLM | Scoring & next-action |
| Notifications | Built-in notifyOwner() | Push on new leads |
| Hosting | Manus WebDev | Managed deployment |

### Database Schema: `leads` Table

| Column | Type | Description |
|---|---|---|
| id | INT (PK) | Auto-increment primary key |
| address | VARCHAR(255) | Full street address |
| city | VARCHAR(100) | City name |
| state | VARCHAR(50) | State (default: IL) |
| zip | VARCHAR(10) | ZIP code |
| targetCity | ENUM | naperville / willow-springs / sag-bridge / palisades |
| firstName | VARCHAR(100) | Contact first name |
| lastName | VARCHAR(100) | Contact last name |
| phone | VARCHAR(20) | Contact phone |
| email | VARCHAR(320) | Contact email |
| contractorSelected | ENUM | yes / no / unknown |
| claimFiled | ENUM | yes / no / unknown |
| bestContactTime | ENUM | morning / afternoon / evening / anytime |
| addressVerified | BOOLEAN | In confirmed hail swath? |
| hailSizeConfirmed | VARCHAR(20) | Confirmed hail size for address |
| stormConfirmationMessage | TEXT | Dynamic message shown to homeowner |
| leadScore | INT | Calculated score 0–100 |
| status | ENUM | new / contacted / appointment_set / inspected / contracted / lost |
| nextAction | TEXT | AI-assigned next action |
| nextActionDue | TIMESTAMP | Deadline for next action |
| source | VARCHAR(100) | landing_page / qr_code / referral / door_knock |
| qrCodeScanned | BOOLEAN | Lead came via QR code? |
| createdAt | TIMESTAMP | Record creation |
| updatedAt | TIMESTAMP | Last update |
| lastActivityAt | TIMESTAMP | Last activity |

---

## Landing Page Structure (Per City)

Each of the 4 cities has a dedicated landing page at `/{city-slug}`:

1. **Urgency Bar** — Insurance deadline countdown (March 10, 2027 — X days remaining)
2. **Hero Section** — City-specific headline + NWS verified badge + CTA
3. **Storm Evidence** — Confirmed hail size, storm timeline, affected property count
4. **NWS Source Block** — Direct quote + source link + retrieval date
5. **Hail Damage Guide** — Visual size comparison showing damage at each size
6. **Multi-Step Form** — Progressive profiling (address → contact → qualifying)
7. **Trust Badges** — NWS Verified · Free Inspection · Local Contractor · Licensed
8. **Urgency CTA** — Final deadline reminder + CTA button

### Multi-Step Lead Capture Form

| Step | Fields | Logic |
|---|---|---|
| Step 1: Address | Full address, City, State, ZIP | Verify against hail swath → show confirmation |
| Step 2: Contact | First name, Last name, Phone, Email | Display personalized storm confirmation tied to address |
| Step 3: Qualifying | Contractor selected? Claim filed? Best contact time | Score lead, assign next action, submit to DB |

---

## Automated Workflows

| # | Trigger | Actions | Outcome |
|---|---|---|---|
| 1 | New Lead Submitted | Verify address → Score → Assign next action → Notify owner → Queue outreach | Lead scored and queued within SLA |
| 2 | QR Code Scanned | Create/update lead → +10 bonus → Notify → Show confirmation → Offer booking | High-intent lead fast-tracked |
| 3 | Appointment Scheduled | Update status → Calendar event → SMS + email confirmation → Prep action | Appointment confirmed |
| 4 | Inspection Completed | Record findings → If damage: generate estimate → If not: ask referral, close | Lead moved toward contract or closed |
| 5 | Daily Executive Briefing | Contracts vs goal → Inspections vs needed → Top 10 leads → Overdue actions → Forecast | Owner knows exactly what to do each day |
| 6 | Lead Stale (48h) | Flag → Escalate priority → Re-engagement action → 7d: drip campaign | No lead ever sits idle |

---

## Success Metrics

| Metric | Definition |
|---|---|
| Signed Contracts | Primary KPI — target 40/month |
| Revenue Generated | Contracts × Avg contract value |
| Revenue per Inspection | Total revenue ÷ Total inspections |
| Revenue per Lead | Total revenue ÷ Total leads generated |
| Time: Lead → Contract | Average days from creation to signed contract |
| Close Rate | Contracts ÷ Inspections completed |
| Pipeline Velocity | Average days per stage transition |

---

## Planned Phase 2 Integrations

| Technology | Purpose |
|---|---|
| Twilio | SMS notifications and appointment reminders |
| Google Calendar | Appointment scheduling and sync |
| Lob.com | Automated physical postcard mailing to high-score leads |
| OpenAI API | Advanced lead scoring and next-action recommendations |
| Calendly | Self-service appointment booking |
| Google Maps | Address geocoding + hail swath polygon verification |

---

## File Structure

```
visualize/
├── client/src/
│   ├── pages/
│   │   ├── Home.tsx              ← City selector hub
│   │   ├── CityLanding.tsx       ← Dynamic city landing page
│   │   ├── LeadForm.tsx          ← Multi-step lead capture
│   │   ├── ThankYou.tsx          ← Post-submission confirmation
│   │   ├── Dashboard.tsx         ← Admin lead management
│   │   └── LeadDetail.tsx        ← Individual lead view
│   ├── components/               ← Reusable UI components
│   ├── index.css                 ← Design tokens & theme
│   └── App.tsx                   ← Routes
├── server/
│   ├── routers.ts                ← tRPC procedures (lead CRUD, scoring, verification)
│   ├── db.ts                     ← Database query helpers
│   └── _core/                    ← Framework (auth, LLM, notifications)
├── drizzle/
│   └── schema.ts                 ← Database tables
├── shared/
│   └── stormData.ts              ← NWS verified storm data constants
├── SYSTEM_PLAN.md                ← This file (full context for AI collaborators)
└── todo.md                       ← Feature tracking
```

---

## How to Use This Document with Claude

Paste this repo URL into any Claude conversation with the instruction:

> "Here is the full Visualize system. Use this repo as context for all work on this project. The SYSTEM_PLAN.md contains the complete architecture, scoring model, storm data, workflows, and specifications."

Claude will be able to read all source files, understand the architecture, and contribute meaningfully to any aspect of the system.
