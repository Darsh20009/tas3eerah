---
name: Geidea test checkout
description: Verified KSA test endpoints and a request-field constraint discovered while integrating Geidea Checkout.
---

For the KSA Geidea test flow, create sessions through `api.ksamerchant.geidea.net` and load hosted checkout from `www.ksamerchant.geidea.net`. Use a short ASCII order description; Arabic text caused the session API to reject the request with response code 110. Merchant references must also be short alphanumeric values: a longer punctuated reference was rejected with detailed response 035.

**Why:** Geidea's KSA sandbox rejects some otherwise reasonable merchant-reference formats and Arabic order descriptions.

**How to apply:** keep API credentials server-side, use KSA test hosts with test credentials, use a short ASCII description and alphanumeric reference, and retain server-side order verification before granting a plan.

The hosted form may redirect directly to the configured return URL with `orderId` and `sessionId`; verify the order on the server and bind it to the authenticated user's stored session before granting a plan. Geidea order lookups can contain both Authentication and Pay transactions; use the Pay transaction and the provider's top-level response code rather than treating the first transaction as the payment result.

**Why:** a real sandbox order succeeded while the first transaction was Authentication, and an earlier parser marked it failed despite the order and Pay transaction succeeding.

**How to apply:** test the complete HPP return and server-side confirmation, not only session creation. A declined attempt can leave the HPP open without an error callback. Query the KSA order endpoint by the stored `MerchantReferenceId` while checkout is open; show a decline only for a final failed order, and still verify successful orders by order ID before activation.

The user wants Geidea checkout inside the current app page as a bottom sheet, not in a separate checkout page. Geidea's SDK explicitly rejects embedded frames (`window !== top`), so use its in-page checkout only when the app itself is top-level. In Replit's embedded preview, explain the limitation and offer to open the app itself in a standalone browser tab; do not bypass the SDK with a raw hosted-checkout iframe.

**Why:** the user explicitly requested same-page checkout, while Geidea's supported SDK refuses to run inside the nested Replit preview.

**How to apply:** style Geidea's SDK-created checkout iframe as a bottom sheet in top-level app pages. Do not create a payment session inside an embedded preview that the SDK will reject.

**Why:** the KSA sandbox returned a final Failed order with a Pay transaction by merchant-reference lookup even though the hosted iframe had sent no error callback to its parent.

Refunds must follow the published one-hour and unused-plan conditions, require an explicit admin action, and refund the full captured amount. Keep direct refunds sandbox-only until live merchant credentials and permissions are configured. If Geidea's outcome is ambiguous, block automatic retries and reconcile the order in the merchant portal first.

**Why:** a timed-out refund response can hide a completed money movement; retrying blindly could refund the same purchase twice, and this project currently has test credentials only.

**How to apply:** re-check payment status, amount, currency, ownership, request window, and recorded feature usage before the admin confirms. Treat provider success as complete only after its returned order status confirms a full refund.
