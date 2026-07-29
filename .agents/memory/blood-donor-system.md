---
name: Blood Donor System Design
description: Key decisions for the Blood Donor Search + Nearby Donor System feature
---

# Blood Donor System Design

## Key decisions

**isDonor stored as text("is_donor"), not boolean**
Why: Safer with Drizzle migrations on this project; consistent with other text fields.
How to apply: Always compare with eq(usersTable.isDonor, "true") not a boolean.

**Phone number privacy**
safeDonorProfile() strips phone from public results. Contact only revealed via notification when request is accepted.

**Nearby priority algorithm**
Implemented in JS: area=4, district=3, division=2, country=1. No geospatial extension needed.

**New DB tables**
- blood_donor_requests (requesterId, donorId, bloodGroup, message, status)
- emergency_blood_requests (userId nullable, bloodGroup, quantity, hospital, city, contactNumber, notes, status)
- Added isDonor/donorStatus/lastDonationDate to users table

**Routes added**
GET/POST /blood-donors, GET /blood-donors/nearby, POST /blood-requests,
GET/PATCH /patient/blood-requests, /blood-requests/:id,
POST /emergency-blood-requests, admin CRUD at /admin/blood-donors + /admin/emergency-blood-requests

**Doctor integration**
Extended /doctor/patient-photo to also return bloodGroup. Full queue/prescription UI deferred.
