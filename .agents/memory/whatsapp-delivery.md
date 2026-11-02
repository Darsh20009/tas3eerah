---
name: WhatsApp delivery semantics
description: Distinguishes provider acceptance from actual WhatsApp message delivery.
---

Do not treat a successful HTTP response from QIROX as proof that a WhatsApp OTP reached the recipient. Provider acceptance and handset delivery are separate states; only a delivery receipt or callback can confirm arrival.

**Why:** the signup UI reported that a code was sent while the user did not receive it, and earlier tests mocked a provider success response without validating delivery.

**How to apply:** inspect explicit provider rejection fields, keep diagnostics free of phone numbers, OTPs, and credentials, and use a provider delivery receipt before claiming the message arrived.
