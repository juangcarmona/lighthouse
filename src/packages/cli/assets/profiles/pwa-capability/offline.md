# PWA offline policy

Classify each bounded context as online-only, read-only offline or read-write offline before adding data caching.

Keep assets, navigation and data caches separate so an update can invalidate one policy without changing the others.

Read-only offline journeys need an explicit freshness rule and a visible stale state.

Read-write offline journeys need conflict handling, replay rules, authentication recovery and evidence for a changed user.

Private API responses remain online-only until the product and architecture define encryption, retention, invalidation and conflict behavior.
