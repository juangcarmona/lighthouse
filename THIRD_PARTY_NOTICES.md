# Third-party notices

The root Apache-2.0 license covers Lighthouse-authored material. The following provider-owned material retains its upstream terms; the Lighthouse license does not replace them.

| Material in this repository | Terms and retained attribution |
| --- | --- |
| `.agents/skills/arc-architecture/references/arc42/` | CC BY-SA 4.0; Dr. Gernot Starke. The [source register](.agents/skills/arc-architecture/references/arc42/SOURCES.md) records the pinned source, individual pages and attribution. Its [license notice](.agents/skills/arc-architecture/references/arc42/ARC42-LICENSE) remains in place. |
| ArcShape-managed `.agents/skills/arc-*` outside that reference subtree | Apache-2.0, as declared by `@arcshape/cli@0.4.0`; ArcShape retains managed-file ownership. |
| ProductShape-managed `.product/` templates, `.agents/commands/product/`, product skills and `openspec/schemas/product-*` | Apache-2.0, as declared by the installed provider and its `@prodshape/cli@0.22.0` installation record. The workspace's CLI dependency is separately pinned to `0.23.0`, also Apache-2.0. ProductShape retains managed-file ownership. |

The arc42 reference files are included in the source repository, not the CLI, SDLC or UI npm tarballs. Their share-alike terms apply to that material and its adaptations. Remote illustrations referenced by those files are not bundled.

## Dependencies and external tools

The three Lighthouse npm packages do not bundle dependency code in their tarballs. npm installs declared dependencies separately with their own licenses and notices. In particular, the CLI uses ArcShape, ProductShape and the other Lighthouse packages; the workspace uses OpenSpec under MIT. Consult each exact installed package's license and lockfile rather than treating all dependencies as Apache-2.0.

The .NET starter includes Lighthouse sources and NuGet dependency declarations and lockfiles, not restored dependency binaries. NuGet packages retain their own terms. GitHub Actions and worker images likewise reference external tools and services; their licenses and service terms remain separate.

No additional embedded third-party copyright or license notices were found in the reviewed Lighthouse package sources. This inventory records the tracked notices and distribution boundaries for #215; it makes no claim to relicense external dependencies, provider-owned files or consumer code.
