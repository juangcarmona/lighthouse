# `/lighthouse:stage-result`

Use `lighthouse-sdlc stage-result --input <file>` to validate a report's structure, including unresolved reports. Before reporting worker success, add `--require-complete --stage <stage> --run-id <id>` to require the dispatched identity, the declared gate, a passed status and no unresolved evidence or blockers. Host approval remains necessary to cross human gates.
