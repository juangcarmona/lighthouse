# .NET MAUI mobile testing

| Layer | Purpose | Evidence |
| --- | --- | --- |
| Restore and build | Prove each selected target resolves and compiles | Locked CI output |
| Unit | Exercise pure rules and client behavior | .NET test output |
| Integration | Exercise API, authentication and secure storage boundaries | Approved test host or device evidence |
| Lifecycle | Prove background, resume, logout, expiry and user change | Emulator or device journey |
| Device capability | Prove selected permissions, links, notifications, camera or files | Target-specific evidence |

The first vertical slice covers authentication, secure storage, one API call and one real interaction on the selected platform.

Keep signing material and provider credentials outside fixtures. Retain the target platform and build configuration with the evidence.
