---
name: Geidea test checkout
description: Verified KSA test endpoints and a request-field constraint discovered while integrating Geidea Checkout.
---

For the KSA Geidea test flow, create sessions through `api.ksamerchant.geidea.net` and load hosted checkout from `www.ksamerchant.geidea.net`. Use a short ASCII order description; Arabic text caused the session API to reject the request with response code 110. Merchant references must also be short alphanumeric values: a longer punctuated reference was rejected with detailed response 035.

**Why:** Geidea's KSA sandbox rejects some otherwise reasonable merchant-reference formats and Arabic order descriptions.

**How to apply:** keep API credentials server-side, use KSA test hosts with test credentials, use a short ASCII description and alphanumeric reference, and retain server-side order verification before granting a plan.

The hosted form may redirect directly to the configured return URL with `orderId` and `sessionId`; verify the order on the server and bind it to the authenticated user's stored session before granting a plan. Geidea order lookups can contain both Authentication and Pay transactions; use the Pay transaction and the provider's top-level response code rather than treating the first transaction as the payment result.

**Why:** a real sandbox order succeeded while the first transaction was Authentication, and an earlier parser marked it failed despite the order and Pay transaction succeeding.

**How to apply:** test the complete HPP return and server-side confirmation, not only session creation. The KSA sandbox's declined-card response may leave the HPP open without posting an error callback to the parent, so do not infer activation from browser state or assume the callback fires on every decline.
