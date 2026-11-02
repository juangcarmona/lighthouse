import { realpath, stat } from 'node:fs/promises';
import path from 'node:path';

const key = (binding, id) => [binding.projectId, binding.repository, binding.scope, binding.scope === 'run' ? binding.runId : '', id];
const where = 'project = ? AND repository = ? AND scope = ? AND run = ? AND id = ?';
const inside = (root, file) => { const relative = path.relative(root, file); return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative)); };

/** Operator-side only. Never expose this handle or its path to a worker. */
export async function openSqliteMemoryProvider({ filename, disposableRoots }) {
  let db;
  try {
    if (!path.isAbsolute(filename) || !Array.isArray(disposableRoots) || !disposableRoots.length || !disposableRoots.every((root) => path.isAbsolute(root))) throw new Error('placement');
    const parent = await realpath(path.dirname(filename));
    let canonical = path.join(parent, path.basename(filename));
    try { canonical = await realpath(filename); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    for (const root of disposableRoots) if (inside(await realpath(root), canonical)) throw new Error('placement');
    // The directory is operator-provisioned: no automatic directory creation.
    if (((await stat(parent)).mode & 0o077) || ((await stat(path.dirname(canonical))).mode & 0o077)) throw new Error('private directory required');
    const { DatabaseSync } = await import('node:sqlite');
    db = new DatabaseSync(canonical);
    db.exec(`PRAGMA busy_timeout = 1000;
      CREATE TABLE IF NOT EXISTS lighthouse_learnings_v1 (
        project TEXT NOT NULL, repository TEXT NOT NULL, scope TEXT NOT NULL, run TEXT NOT NULL, id TEXT NOT NULL,
        version INTEGER NOT NULL, state TEXT NOT NULL, expires INTEGER NOT NULL, document TEXT NOT NULL,
        PRIMARY KEY(project, repository, scope, run, id));
      CREATE TABLE IF NOT EXISTS lighthouse_learning_audit_v1 (
        project TEXT NOT NULL, repository TEXT NOT NULL, scope TEXT NOT NULL, run TEXT NOT NULL, id TEXT NOT NULL,
        version INTEGER NOT NULL, event TEXT NOT NULL, previous TEXT NOT NULL,
        PRIMARY KEY(project, repository, scope, run, id, version));`);
    const load = db.prepare(`SELECT * FROM lighthouse_learnings_v1 WHERE ${where}`);
    const audit = db.prepare('INSERT INTO lighthouse_learning_audit_v1 VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    const update = db.prepare(`UPDATE lighthouse_learnings_v1 SET version = ?, state = ?, expires = ?, document = ? WHERE ${where} AND version = ?`);
    const transition = (binding, id, expectedVersion, record, state, event) => {
      db.exec('BEGIN IMMEDIATE');
      try {
        const previous = load.get(...key(binding, id));
        if (!previous || previous.version !== expectedVersion) { db.exec('ROLLBACK'); return false; }
        const old = JSON.parse(previous.document);
        const { value: _value, ...metadata } = old;
        audit.run(...key(binding, id), expectedVersion, JSON.stringify(event), JSON.stringify(metadata));
        update.run(expectedVersion + 1, state, record ? Date.parse(record.retention) : previous.expires, record ? JSON.stringify(record) : previous.document, ...key(binding, id), expectedVersion);
        db.exec('COMMIT');
        return true;
      } catch (error) { db.exec('ROLLBACK'); throw error; }
    };
    return Object.freeze({
      available: true,
      insert(record) {
        const result = db.prepare('INSERT OR IGNORE INTO lighthouse_learnings_v1 VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)').run(...key(record, record.id), 'active', Date.parse(record.retention), JSON.stringify(record));
        return result.changes === 1;
      },
      select(access, topics, limit, now) {
        const rows = db.prepare(`SELECT document, version FROM lighthouse_learnings_v1
          WHERE project = ? AND repository = ? AND state = 'active' AND expires > ?
          AND ((scope = 'project' AND ? = 1) OR (scope = 'run' AND run = ? AND ? = 1))
          AND EXISTS (SELECT 1 FROM json_each(document, '$.topics') WHERE value IN (${topics.map(() => '?').join(',')}))
          ORDER BY id, scope LIMIT ?`).all(access.projectId, access.repository, now, Number(access.scopes.includes('project')), access.runId, Number(access.scopes.includes('run')), ...topics, limit);
        return rows.map((row) => ({ ...JSON.parse(row.document), version: row.version }));
      },
      replace(binding, id, version, record, event) { return transition(binding, id, version, record, 'active', event); },
      exclude(binding, id, version, state, event) { return transition(binding, id, version, null, state, event); },
      history(binding, id) {
        return db.prepare(`SELECT version, event, previous FROM lighthouse_learning_audit_v1 WHERE ${where} ORDER BY version`).all(...key(binding, id)).map((row) => ({ version: row.version, event: JSON.parse(row.event), previous: JSON.parse(row.previous) }));
      },
      close() { db.close(); }
    });
  } catch {
    try { db?.close(); } catch { /* A failed open never exposes storage details. */ }
    return { available: false, message: 'Operator must provision a private SQLite directory outside disposable roots and a Node runtime with SQLite support.' };
  }
}
