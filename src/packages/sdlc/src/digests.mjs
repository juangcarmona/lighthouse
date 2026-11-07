import { createHash } from 'node:crypto';

export const digest = (text) => createHash('sha256').update(text).digest('hex');
export const taskDigest = (issue, comments) => digest(JSON.stringify({ title: issue.title, body: issue.body, comments: comments.map(c => ({ id: c.id, body: c.body, updated_at: c.updated_at })) }));
