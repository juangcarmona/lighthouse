# `/lighthouse:aliases`

Use `lighthouse-sdlc aliases --format json` to inspect the SDLC package's versioned agent-command aliases. The output maps each `/lh:*` alias to one canonical `/lighthouse:*` command and its packaged command asset.

The alias listing is read-only. The configured agent host decides how to expose the aliases and must reference the canonical command asset instead of copying or maintaining a second command implementation.
