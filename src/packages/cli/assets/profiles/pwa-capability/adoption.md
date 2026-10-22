# Adopt the Lighthouse PWA capability

Select `pwa-capability` with `react-web-platform` when installability, asset caching or a declared offline journey is a product requirement.

Choose the bounded contexts that work offline and record which actions remain online-only.

Define the update and recovery behavior before enabling a service worker in production. Test a fresh install, an update, logout, session expiry and a user change.

Keep the application source, manifest values, icons and service-worker implementation product-owned after adoption.
