# Appointments Day Ops — Design

**Status:** Approved via interactive mockup (`docs/mockups/appointments-command-center.html`)  
**Surface:** ecommerce-portal Appointments page  
**Date:** 2026-11-15

## Goal

Help merchant staff **see today’s load**, **confirm pending bookings**, and **spot open gaps** on desktop and mobile — without a Kanban/Board view.

## Views

| UI label | Store `view` value | Notes |
|----------|-------------------|--------|
| Day | `daily` | Default. Timeline + attention rail |
| Week | `weekly` | Existing week slots |
| Calendar | `monthly` | Month grid (label only; value stays `monthly`) |
| List | `listing` | Existing table |

No Board / status Kanban.

## Layout

### Desktop
- Compact command chrome (date nav lives in existing daily/weekly/monthly headers + filter toolbar)
- Horizontal **attention rail**: Needs confirm, Next up, Open gap
- **Status chips** with counts (from currently loaded appointments in range; chips filter client-side so counts stay stable)
- Main canvas by view; selected appointment in **side inspector** (existing detail card)

### Mobile
- Same rail (swipe), chips, and Day timeline
- Selected appointment opens a **bottom drawer** (`UDrawer` direction bottom), not a side column
- Dock: jump Week / Calendar + **Next pending**

## Out of scope (MVP)

- Creating appointments from this page (intake remains order/service checkout)
- True free-slot booking API
- Drag-and-drop reschedule
- Separate unfiltered count API

## Success

Staff on phone or desktop can confirm the next pending appointment in fewer taps than the previous table-first layout.
