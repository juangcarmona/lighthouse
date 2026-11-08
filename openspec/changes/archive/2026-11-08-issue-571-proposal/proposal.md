# Preserve opaque source-link tree identity

## Why

The host authenticates tracked source symlinks and omits them from the executable filesystem. Command checks therefore record a tree without those entries, while publication preserves them from the original Git base. The tree-equality guard then rejects a candidate whose executable files match. Keep the guard and bind the same authenticated opaque metadata into the checked-tree identity.

## What changes

Read path/mode/blob-SHA metadata from the admitted Git revision after working-source validation. Carry that host-owned metadata through execution requests and command-evidence binding. Compute the complete candidate Git tree from the checked regular-file tree plus those unchanged opaque entries, using a separate temporary Git index and missing-object support. Do not read a link target's contents, materialize filesystem symlinks or grant an agent changes to the metadata.

## Impact

Shared snapshot, unattended/native preparation, command checks and evidence validation change. Publication still requires exact tree equality. Repositories without source links retain the existing request/evidence shape. Public release, adopter installation and native delivery qualification remain separate gates.
