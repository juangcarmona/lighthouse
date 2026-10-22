# Expo mobile testing

| Layer | Purpose | Evidence |
| --- | --- | --- |
| Static | TypeScript, lint and Expo configuration | CI output |
| Unit and component | Feature and interaction behavior | Jest or Vitest with Testing Library |
| Native integration | Secure storage, permissions, links and API boundary | Emulator or device evidence |
| Lifecycle | Background, resume, logout, expiry and user change | Native journey evidence |
| Web export | Selected web behavior | Separate browser evidence |

The first vertical slice covers authentication, secure storage, one API call and one real interaction on the selected platform.

Keep provider credentials out of fixtures and retain the device or emulator target with the evidence.
