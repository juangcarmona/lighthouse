---
name: lighthouse-pwa
description: Apply the Lighthouse PWA capability when a repository selects pwa-capability.
---

# Lighthouse PWA capability

Read the PWA guide before changing an adopter's installability or offline behavior.

Separate asset, navigation and private-data caching. Declare the bounded contexts that work offline and the actions that need the network.

Keep authenticated sessions on the web BFF contract. Keep tokens out of browser storage and test logout, expiry and user changes.

Run install, update, cache and browser evidence after a focused change. Treat a missing update or recovery test as an incomplete capability.
