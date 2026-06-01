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
- [x] Mobile responsiveness verification on all pages (verified via browser QA)
- [x] All CTAs functional (verified — links to form work correctly)
- [x] All source links open correctly (NWS badges verified)
- [x] Urgency countdown logic (targets March 10, 2027)
- [x] Form validation on all steps
- [x] Vitest tests for backend procedures (23/23 passing)
- [x] Final checkpoint

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
- [x] Geographic clustering bonus — haversine distance + cluster routing
- [x] AI-powered next-action via LLM with structured output (Chief of Staff voice)

## Completed Jobs & Jones Collateral
- [x] Database schema: completedJobs table (address, lat/lng, before/after photos, completion date, permission level)
- [x] Backend tRPC: addCompletedJob mutation (admin)
- [x] Backend tRPC: getNearbyCompletedJobs query — proximity search by lat/lng
- [x] Backend tRPC: listCompletedJobs query (admin)
- [x] Photo upload for before/after images to S3

## Inspection Presentation Mode
- [x] Dedicated /inspect/:leadId route — mobile-optimized for iPad
- [x] Pre-loaded storm evidence for the lead's city
- [x] Lead details and storm confirmation displayed
- [x] Nearby Jones collateral section — auto-populated from completedJobs proximity query
- [x] Damage photo capture and upload from iPhone (camera integration in inspection mode)
- [ ] Digital authorization form with e-signature (SKIPPED per user)
- [x] PWA Service Worker for offline caching of inspection data
- [x] Pre-cache collateral for scheduled inspections (via SW message API)
- [x] Offline fallback — network-first with cache fallback for all routes

## Credibility & Source Tracking
- [x] All storm data accompanied by date stamps, source links
- [x] NWS source badge on every city landing page
- [ ] Video links from government/local sources (SKIPPED per user)

## Notification Systems (All 10)
- [x] 1. Owner notifications — enhanced: new lead alert with ROI score and next action included
- [x] 2. Push notifications — via Manus owner notify (upgradeable to web push)
- [x] 3. In-app notification panel — bell icon in dashboard with activity feed
- [x] 4. Homeowner confirmation — immediate after form submit + drip enrollment
- [x] 5. Deadline escalation alerts — automated at 90/60/30/7 days for unconverted leads
- [x] 6. Daily briefing — morning summary: top 3 actions, pipeline value, stale leads
- [x] 7. Neighbor trigger — same street/subdivision detection
- [x] 8. Inspection follow-up reminders — 48h after inspection without advancement
- [x] 9. Social proof milestones — 10/25/50/100 completions per city
- [x] 10. Homeowner drip sequence — confirmation → 24h → 3d → 7d with escalating urgency
- [x] Heartbeat job registration (5 scheduled cron jobs)
- [x] Notification database table with full metadata
- [x] Drip sequence table with scheduling
- [x] Vitest tests for notification logic (43/43 passing)

## Gaps to Address
- [x] Implement homeowner email queue with review/approve/send workflow in dashboard
- [x] Execute heartbeat job setup — all 5 jobs registered and active
- [x] Add delivered/deliveredAt tracking via markDelivered endpoint
