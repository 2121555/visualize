# Visualize — Project TODO

## Phase 2: Database & Backend
- [ ] Database schema: leads table with address, contact, qualifying fields, city, score, status, next_action
- [ ] Database schema: storm_evidence table for NWS data per city
- [ ] Backend tRPC: submitLead mutation (public)
- [ ] Backend tRPC: getLeads query (protected/admin)
- [ ] Backend tRPC: getLead by id (protected/admin)
- [ ] Backend tRPC: updateLeadStatus mutation (protected/admin)
- [ ] Backend tRPC: verifyAddress query (public) — checks address against hail swath
- [ ] Run pnpm db:push

## Phase 3: Design System & Routing
- [ ] Global color palette: deep navy + storm amber + white (trust/urgency theme)
- [ ] Google Fonts: Inter (body) + Oswald (headlines)
- [ ] index.css: CSS variables, dark theme base
- [ ] App.tsx: routes for /, /naperville, /willow-springs, /sag-bridge, /palisades, /dashboard
- [ ] Shared components: HeroSection, StormEvidenceBanner, UrgencyCountdown, TrustBadges
- [ ] Shared components: NWSSourceBadge with date stamp and source link

## Phase 4: City Landing Pages
- [ ] Naperville landing page with NWS data (1.25" confirmed hail, 106 properties)
- [ ] Willow Springs landing page with NWS data
- [ ] Sag Bridge landing page with NWS data
- [ ] Palisades landing page with NWS data
- [ ] Each page: storm timeline, hail size comparison, affected property count
- [ ] Each page: insurance claim deadline (March 10, 2027) prominently displayed
- [ ] Each page: NWS source badge with date stamp and link
- [ ] Each page: CTA linking to multi-step form

## Phase 5: Multi-Step Lead Capture Form
- [ ] Step 1: Address entry with hail swath verification
- [ ] Step 2: Contact info (name, phone, email) + dynamic storm confirmation message
- [ ] Step 3: Qualifying questions (contractor selected, claim filed, best contact time)
- [ ] Form progress indicator (Step 1/2/3)
- [ ] Form submission saves lead to database
- [ ] Owner notification on new lead submission
- [ ] Success confirmation page/state

## Phase 6: Lead Management Dashboard
- [ ] Protected dashboard route (admin only)
- [ ] Lead list table with all fields
- [ ] Lead detail view
- [ ] Lead status update (New, Contacted, Appointment Set, Inspected, Contracted, Lost)
- [ ] Filter/sort by city, status, date
- [ ] Lead score display
- [ ] Export-ready layout

## Phase 7: QA & Polish
- [ ] Mobile responsiveness on all pages
- [ ] All CTAs functional
- [ ] All source links open correctly
- [ ] Urgency countdown accurate
- [ ] Form validation on all steps
- [ ] Vitest tests for backend procedures
- [ ] Final checkpoint
