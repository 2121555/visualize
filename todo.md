# Visualize — Project TODO

## Phase 2: Database & Backend
- [x] Database schema: leads table with address, contact, qualifying fields, city, score, status, next_action
- [x] Database schema: completedJobs table for Jones collateral
- [x] Backend tRPC: submitLead mutation (public)
- [x] Backend tRPC: getLeads query (protected/admin)
- [x] Backend tRPC: getLead by id (protected/admin)
- [x] Backend tRPC: updateLeadStatus mutation (protected/admin)
- [x] Backend tRPC: verifyAddress query (public) — checks address against hail swath
- [x] Run pnpm db:push

## Phase 3: Design System & Routing
- [x] Global color palette: deep navy + storm amber + white (trust/urgency theme)
- [x] Google Fonts: Inter (body) + Oswald (headlines)
- [x] index.css: CSS variables, dark theme base
- [x] App.tsx: routes for /, /naperville, /willow-springs, /sag-bridge, /palisades, /dashboard
- [x] Page-level components: HeroSection, StormEvidenceBanner, UrgencyCountdown, TrustBadges (inline in CityLanding/Home)
- [x] NWSSourceBadge with date stamp and source link (inline in CityLanding)

## Phase 4: City Landing Pages
- [x] Naperville landing page with NWS data (1.25" confirmed hail, 106 properties)
- [x] Willow Springs landing page with NWS data
- [x] Sag Bridge landing page with NWS data
- [x] Palisades landing page with NWS data
- [x] Each page: storm timeline, hail size comparison, affected property count
- [x] Each page: insurance claim deadline (March 10, 2027) prominently displayed
- [x] Each page: NWS source badge with date stamp and link
- [x] Each page: CTA linking to multi-step form

## Phase 5: Multi-Step Lead Capture Form
- [x] Step 1: Address entry with hail swath verification
- [x] Step 2: Contact info (name, phone, email) + dynamic storm confirmation message
- [x] Step 3: Qualifying questions (contractor selected, claim filed, best contact time)
- [x] Form progress indicator (Step 1/2/3)
- [x] Form submission saves lead to database
- [x] Owner notification on new lead submission
- [x] Success confirmation page/state

## Phase 6: Lead Management Dashboard
- [x] Protected dashboard route (admin only)
- [x] Lead list table with all fields
- [x] Lead detail view
- [x] Lead status update (New, Contacted, Appointment Set, Inspected, Contracted, Lost)
- [x] Filter/sort by city, status, date
- [x] Lead score display (ROI-first with expected return)
- [x] Pipeline value and daily briefing

## Phase 7: QA & Polish
- [ ] Mobile responsiveness verification on all pages
- [ ] All CTAs functional (browser QA needed)
- [ ] All source links open correctly (browser QA needed)
- [x] Urgency countdown logic (targets March 10, 2027)
- [x] Form validation on all steps
- [x] Vitest tests for backend procedures (23/23 passing)
- [ ] Final checkpoint

## Social Proof & Neighbor Activity
- [x] Backend tRPC: getCityStats query (public) — returns anonymized counts per city
- [x] Backend tRPC: getRecentActivity query (public) — returns recent anonymized activity feed
- [x] City landing page: Live counter showing how many neighbors have already started the process
- [x] City landing page: "Your neighbors are acting" social proof banner with recent activity
- [x] City landing page: Restoration progress tracker (inspections → claims → restorations per city)

## ROI-First Scoring Engine (Redesign)
- [x] Redesign scoring from qualification-based to ROI-first: Expected Return = (Job Value × Close Probability) / Time-to-Close
- [x] Estimated job value calculation based on property data and city
- [x] Close probability based on qualification signals (no contractor, no claim, verified address)
- [x] Time decay factor — leads lose value every hour without contact
- [x] Tier assignment based on expected return, not just qualification score
- [x] Next-action engine with Chief of Staff voice
- [ ] Geographic clustering bonus — multiple leads near each other = efficient routing (Phase 2)
- [ ] AI-powered next-action via LLM with structured output (Phase 2)

## Completed Jobs & Jones Collateral
- [x] Database schema: completedJobs table (address, lat/lng, before/after photos, completion date, permission level)
- [x] Backend tRPC: addCompletedJob mutation (admin)
- [x] Backend tRPC: getNearbyCompletedJobs query — proximity search by lat/lng
- [x] Backend tRPC: listCompletedJobs query (admin)
- [ ] Photo upload for before/after images to S3 (Phase 2)

## Inspection Presentation Mode
- [x] Dedicated /inspect/:leadId route — mobile-optimized for iPad
- [x] Pre-loaded storm evidence for the lead's city
- [x] Lead details and storm confirmation displayed
- [x] Nearby Jones collateral section — auto-populated from completedJobs proximity query
- [ ] Damage photo capture and upload from iPhone (Phase 2)
- [ ] Digital authorization form with e-signature (Phase 2)
- [ ] PWA Service Worker for offline caching of inspection data (Phase 2)
- [ ] Pre-cache collateral for scheduled inspections (Phase 2)
- [ ] Offline fallback — works without connectivity for presentation flow (Phase 2)

## Credibility & Source Tracking
- [x] All storm data accompanied by date stamps, source links
- [x] NWS source badge on every city landing page
- [ ] Video links from government/local sources where available (Phase 2)

## Notification Systems (All 10)
- [ ] 1. Owner notifications — enhanced: new lead alert with ROI score and next action included
- [ ] 2. Push notifications — real-time alerts to phone for high-value leads, QR scans, deadline approaches
- [ ] 3. In-app notification panel — bell icon in dashboard with activity feed (new leads, status changes, appointments)
- [ ] 4. Homeowner confirmation — immediate email/notification after form submission with next steps
- [ ] 5. Deadline escalation alerts — automated at 90/60/30/7 days for unconverted leads
- [ ] 6. Daily briefing — morning summary: top 3 actions, new leads overnight, pipeline delta, stale leads
- [ ] 7. Neighbor trigger — alert when new lead submits from same street/subdivision as existing lead
- [ ] 8. Inspection follow-up reminders — nudge if inspected lead doesn't advance within 48 hours
- [ ] 9. Social proof milestones — alerts at 10/25/50 completions per city, conversion rate milestones
- [ ] 10. Homeowner drip sequence — timed: immediate → 24hr → 3-day → 7-day with escalating urgency
