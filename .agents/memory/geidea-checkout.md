---
name: Geidea test checkout
description: Verified KSA test endpoints and a request-field constraint discovered while integrating Geidea Checkout.
---

For the KSA Geidea test flow, create sessions through `api.ksamerchant.geidea.net` and load hosted checkout from `www.ksamerchant.geidea.net`. Use a short ASCII order description; Arabic text caused the session API to reject the request with response code 110.

**Why:** the provider accepted the server-signed test request after the description was changed to ASCII; the Arabic description returned an invalid-character response.

**How to apply:** keep API credentials server-side, use the KSA test hosts for test MID credentials, and retain server-side order verification before granting a plan.
