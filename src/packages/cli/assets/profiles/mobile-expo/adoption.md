# Adopt the Lighthouse Expo mobile profile

Select `mobile-expo` only when Android or iOS is a product requirement. Select `dotnet-backend` when the product also owns a Lighthouse backend.

Set `application.shape` to `mobile` for a mobile-only project or `full-stack` for a mobile application with its backend, and include `expo` in `application.stacks`.

Start with authentication, secure storage, one API call and one real interaction in an emulator or device.

Choose web export deliberately and keep its browser evidence separate from native evidence.

The mobile source, native configuration, permissions and signing policy become product-owned after adoption.
