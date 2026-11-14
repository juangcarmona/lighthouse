---
"@juangcarmona/lighthouse-sdlc": patch
---

# Support large ProductShape models

Remove fixed artifact-count ceilings from local and API model fingerprints and from planning evidence preparation and installation. Models with 640 artifacts now retain all reports and index entries when they fit the resource budgets.

Keep the 64 KiB model-file, 512 KiB report/index, 16 MiB prepared-report and 17 MiB installed-evidence limits. Local fingerprints now use the API fingerprint's explicit 8 MiB aggregate-model budget. Baseline binding, provider validation, safe paths and read-only installation remain unchanged.
