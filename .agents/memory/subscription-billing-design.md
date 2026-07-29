---
name: Subscription Billing Design
description: Key decisions for the auto-payment subscription billing system added to QRX.
---

# Subscription Billing Design

## What was added
- Monthly subscription fee (configurable in admin settings, default ৳500/month)
- `autoApproveOnPayment` admin toggle — when on, recording payment auto-approves the doctor
- `months` + `monthlyFee` columns added to `subscriptions` table
- New API endpoints: `POST /subscriptions/pay`, `POST /subscriptions/{id}/renew`, `GET /doctors/me/subscription`

## Key decisions

**Fee model during registration vs. renewal:**
- Doctor registration still uses BMDC-tier based `calcSubscriptionFee()` (0 / ৳500 / ৳1000) as the *per-month* base rate
- Pay/renew endpoints use `app_settings.monthlySubscriptionFee` as the global rate (admin-configurable)
- These are intentionally separate: registration shows the tier-based estimate; actual billing uses the live admin setting

**Why:** This allows admins to update the monthly fee without retroactively changing what doctors were shown during registration.

**How to apply:** If these need to converge, update `calcSubscriptionFee` to read from `appSettingsTable` or remove the BMDC-tier logic and use a flat rate everywhere.

**Subscription row per doctor:**
- Schema has no DB-level uniqueness on `doctor_id`; code selects the most recent row (sorted by `updatedAt`) to avoid ambiguity
- Pay endpoint updates by `subscription.id` (not doctorId) to avoid multi-row update

**Input validation:**
- `months` must be integer 1–120; `monthlyFeeOverride` must be non-negative float; enforced server-side
- Frontend also validates/limits months via fixed option buttons

## DB migration needed
Two new columns on `subscriptions` (months, monthly_fee) and two new columns on `app_settings` (monthly_subscription_fee, auto_approve_on_payment) — run `pnpm --filter @workspace/db run push` in dev.
