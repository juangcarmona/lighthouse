# Adopt the Lighthouse .NET MAUI mobile profile

Select `mobile-maui` only when Android or iOS is a product requirement. Select `dotnet-backend` when the product also owns a Lighthouse backend.

Set `application.shape` to `mobile` for a mobile-only project or `full-stack` for a mobile application with its backend, and include `maui` in `application.stacks`.

Start with authentication, secure storage, one API call and one real interaction in an emulator or device.

Select macOS or Windows targets only when the product requires them. Add packaging and signing only when they are in scope.

The mobile source, native configuration, permissions and signing policy become product-owned after adoption.
