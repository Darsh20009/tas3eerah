---
name: Geidea test checkout
description: Verified KSA test endpoints and a request-field constraint discovered while integrating Geidea Checkout.
---

For the KSA Geidea test flow, create sessions through `api.ksamerchant.geidea.net` and load hosted checkout from `www.ksamerchant.geidea.net`. Use a short ASCII order description; Arabic text caused the session API to reject the request with response code 110.

**Why:** the provider accepted the server-signed test request after the description was changed to ASCII; the Arabic description returned an invalid-character response.

**How to apply:** keep API credentials server-side, use the KSA test hosts for test MID credentials, and retain server-side order verification before granting a plan.

End-to-end payment verification requires more than creating a session: confirm the hosted checkout's submit control actually becomes interactive and that the server verifies the returned order before calling the test successful. In Replit preview, the hosted HPP rendered but its pay control remained non-interactive after entering Geidea's documented test-card fields.

**Why:** a valid session and visible hosted form did not prove that a test payment could be submitted; treating that as a successful checkout would overstate coverage.

**How to apply:** record session creation, checkout rendering, cancellation, and completed payment as separate outcomes. If the HPP submit control stays disabled, stop and resolve the test merchant or hosted-frame issue with Geidea before claiming end-to-end payment success.
