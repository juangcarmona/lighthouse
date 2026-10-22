# Reconcile GitHub labels

Run `lighthouse-sdlc github-labels --repo <owner/repo> --input .lighthouse/capabilities.json` to preview the repository label plan. Add `--apply` only after reviewing it; the command creates missing labels, preserves existing labels and writes reconciliation evidence.
