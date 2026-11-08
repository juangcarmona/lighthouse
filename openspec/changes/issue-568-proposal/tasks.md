# Delivery deadline tasks

<!-- pdac-scope: cited -->

## 1. Plan

- [x] 1.1 Inspect the existing admission clock, polling, check validation and publication guards; record ProductShape authority and impact.
- [ ] 1.2 Obtain independent planning acceptance before implementation.

## 2. Implement and verify

- [ ] 2.1 Extract the existing polling loop with virtual-clock/source-observation seams and preserve all head, hold, check-origin and promotion guards.
- [ ] 2.2 Propagate the original deadline through provider, recheck and integration waiting; preserve resource, command and correction bounds.
- [ ] 2.3 Prove CI readiness after ten minutes, deadline/cancellation stops, expiry during a read, changed head/hold and invalid check origin with meaningful regressions.
- [ ] 2.4 Update owning package documentation and run full repository verification, OpenSpec and current citations.

## 3. Integration

- [ ] 3.1 Obtain exact-head independent final technical review and required hosted checks.
- [ ] 3.2 Synchronize/archive specifications through OpenSpec, merge with current forge protections and record the result. Public package publication and adopter configuration remain distinct.

<!-- pdac:cite id="BR-BOUNDED-WORKFLOW" digest="sha256:d67762bd448033970425c077d560dd2749e26200676953cd64aa1c09b31d803d" -->
<!-- pdac:cite id="QR-BOUNDED-AUTOMATION" digest="sha256:bcc08b11d7ab7ebf52669319710f57c9b32ec6b1c17c89c7ae8df6452249450f" -->
<!-- pdac:cite id="BR-STAGE-GATES" digest="sha256:bc61b8429b31d6b4bb9888317d4f665c36681eeca8ce656f027645373339cb3e" -->
