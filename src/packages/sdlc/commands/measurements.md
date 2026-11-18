# Delivery measurements

Read the [measurement contract](../measurements.md). Inspect versioned formulas with `lighthouse-sdlc measurements definitions`. Derive the report from a retained repository/window bundle using `lighthouse-sdlc measurements derive --input frozen.json`.

Report each metric's status, numerator, denominator, coverage, censoring and source links. Offline integrity does not establish live source authenticity. Keep missing fields unknown and preserve historical source revisions. Use `collect --repo owner/repo --start UTC --end UTC --output frozen.json` for the bounded read-only GitHub observation, and `render --input frozen.json --output report.html` for a self-contained offline report. Only collection needs a read-only credential. No operation mutates repository policy or work items.
