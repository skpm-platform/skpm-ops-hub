

# SKPM Platform — Gap Analysis & Implementation Plan

## What You Uploaded
Your v14 handoff document describes a 54-module SPA built entirely with localStorage. Your current Lovable project already has **real Supabase backend** with ~30 database tables and ~29 page modules wired to it. This is a significant upgrade from the old platform.

## Current State vs v14 Handoff

### Already Built (in Lovable)
Auth, Dashboard, Projects, Tasks, Work Orders, Maintenance, Finance, Quotations, Invoices, Expenses, Purchase Orders, Clients, Contracts, Employees, Attendance, Manpower (Workers), Payroll, Assets, Warehouse, HSE, Training, Facilities, Sites, Accommodation, Transport, Calendar, Announcements, Documents, Reports, Visitor Log, Helpdesk, Members, Audit Logs, Settings

### Missing Modules (from v14 doc)
1. **Leave Management** — leave requests/approvals (table `leave_requests` exists but no page)
2. **Timesheets** — hourly time tracking (no table or page)
3. **Duty Roster** — shift scheduling (no table or page)
4. **Staff Directory** — employee directory with search (partially covered by Employees page)
5. **Requisitions** — dedicated page (table exists, no page)
6. **Deployments** — dedicated page (table exists, no page)
7. **Document Compliance** — worker doc expiry tracking (no page)
8. **Gate Passes** — site access passes (no table or page)
9. **MP Billing** — manpower billing (no table or page)
10. **Facility Services** — separate from Facilities (partially covered)
11. **User Management / Access Control** — role management UI (no page)

### Missing Platform Features
- **Global Search** (Cmd+K) — search across all modules
- **Notification Bell** — in-app notification center in top navbar
- **Breadcrumb Navigation** — on all inner pages
- **Favorites** — star/bookmark pages
- **Bulk Actions** — multi-select on tables
- **Pagination** — all tables currently load all rows
- **Keyboard Shortcuts** panel
- **Column Sorting** on table headers
- **Table/Card View** toggle

## Recommended Implementation (Phased)

### Phase 1 — Missing Pages + Core UX (this session)
1. **Add Leave Management page** — uses existing `leave_requests` table
2. **Add Requisitions page** — uses existing `requisitions` table
3. **Add Deployments page** — uses existing `deployments` table
4. **Add notification bell** to AppLayout header — reads from `notifications` table
5. **Add global search** (Cmd+K) — using cmdk (already installed)
6. **Add breadcrumbs** to AppLayout

### Phase 2 — New Tables + Pages
7. **Gate Passes** — create table + page
8. **Timesheets** — create table + page
9. **Duty Roster** — create table + page
10. **MP Billing** — create table + page
11. **Document Compliance** — page for tracking worker doc expiry
12. **User/Access Control** — role management UI

### Phase 3 — Table Enhancements
13. Add pagination (25 per page) to all list pages
14. Add column sorting to all tables
15. Add table/card view toggle
16. Add bulk select + bulk actions
17. Add favorites system

### Phase 4 — Polish
18. Skeleton loading states
19. Empty state illustrations
20. Confirmation dialogs on all deletes
21. Print-optimized views
22. Keyboard shortcuts panel

### Database Changes Needed
- Create tables: `gate_passes`, `timesheets`, `duty_roster`, `mp_billing`
- Add RLS policies for new tables
- No changes to existing tables required

## Security Note
All existing RLS policies are `RESTRICTIVE` with `true` expressions, which means they're effectively open to authenticated users. The v14 doc mentions role-based access — the `has_role()` function and `user_roles` table already exist for implementing granular policies later.

---

**This is a multi-session effort.** I recommend starting with Phase 1 (missing pages + notification bell + global search) since it delivers the most visible impact immediately. Shall I proceed?

