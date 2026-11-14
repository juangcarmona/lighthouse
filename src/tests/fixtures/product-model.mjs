import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function seedProductModel(root, version = 'v1alpha2') {
  await mkdir(join(root, '.product'), { recursive: true });
  await mkdir(join(root, 'docs/product/model/actors'), { recursive: true });
  await writeFile(join(root, '.product/config.yaml'), `version: ${version}\nproduct-root: docs/product\n`);
  await writeFile(join(root, 'docs/product/model/actors/act-reader.md'), `---
id: ACT-READER
type: actor
title: Reader
status: active
actor-kind: human
---

## Purpose

Read product evidence.

## Goals

Understand the verified result.

## Responsibilities

Review current evidence.

## Boundaries

Approval stays explicit.
`);
}
