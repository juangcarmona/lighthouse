# Reconcile labels

Run `lighthouse-sdlc reconcile-labels --input .lighthouse/capabilities.json --existing labels.json` to preview the label capability plan. Add `--apply` only after reviewing it; the command adds missing labels to the local fixture, preserves existing values and writes reconciliation evidence.
