---
"@juangcarmona/lighthouse-sdlc": minor
---

# Bound agent cost per issue, repository and run

Refuse worker dispatch once an issue and worker reach three attempts in 24 hours or two consecutive failures, or once the repository reaches 20 agent runs in 24 hours. `execution-failed` and the new `lighthouse:budget-exceeded` label pause an issue until the owner removes them. Scheduled CI-repair wake-ups stop after repair is requested or stopped, the router polls every 30 minutes, engine runs stop at a configurable token cap, and `lighthouse-sdlc kill-switch` turns automation off across repositories.
