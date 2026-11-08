# Reproducible prefix evidence for candidate 72

Integration 42468253120 correctly stopped because its source snapshot did not contain the prior 33-test baseline. This adds that missing input without changing candidate 0a2cd38a37e132b14e626541d6dcc0dc183165f4 or baseline 8d07da78092e308003c23e9ce0c004e5a3b27910.

The proof contains native Git commit, tree and baseline blob objects. The verifier checks their native object hashes against the admitted commit IDs, derives both file blob identities, authenticates the current candidate bytes and compares the complete baseline byte prefix. The preserved prefix is 21,881 bytes and the candidate appends one test. No network, credentials, source changes or Git history inside the agent sandbox are required. Negative controls reject a changed workspace, forged commit and wrong admitted head.

This supplemental evidence permits another integration assessment of the same head. It does not establish merge, automatic recovery or final acceptance; those remain native workflow outcomes.
