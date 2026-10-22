# React web structure

Keep the repository source under `src/` and keep the primary architecture feature-oriented.

```text
src/
  app/                         routes and application shell
  features/
    <bounded-context>/
      <feature>/
        screen/
        api/
        queries/
        mutations/
        components/
        types/
        tests/
  shared/
    http/
    auth/
    query/
    errors/
    telemetry/
  api/
  i18n/
  design-system/
tests/                          browser and cross-feature evidence
```

Routes compose screens and policy; they do not become a second application layer.

Features follow bounded contexts and use cases. Extract shared code only when more than one feature has a real common contract.

The API client exposes typed contracts and maps transport failures into application errors without leaking transport details into screens.

The profile can run as a Vite SPA or another approved React framework when its output and verification commands remain explicit.
