# Documentation

| Need | Read |
| --- | --- |
| Use the harness | [CLI package guide](../src/packages/cli/README.md) |
| Understand the current system | [Architecture](architecture/README.md) |
| Read product intent | [Product definition](product/README.md) |
| Follow implementation sequencing | [Engineering roadmap](roadmap/lighthouse-engineering.md) |
| Use the backend profile | [.NET profile](../src/dotnet/profile/README.md) |
| Use the visual system | [UI package README](../src/packages/ui/README.md) and [design guide](../src/packages/ui/DESIGN.md) |
| Read durable decisions | [Architecture decisions](architecture/09-architecture-decisions/README.md) |

ProductShape owns product intent, ArcShape owns architecture documentation and Lighthouse owns the implementation and adoption contract. The current command surface is `init` and `verify`; `init` creates the repository boundaries and `verify` checks them together with the managed projection and configured conventions.
