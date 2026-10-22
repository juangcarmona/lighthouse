import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

function issue(code, message, field) {
  return field ? { code, message, field } : { code, message };
}

export async function ghJson(args, { command = 'gh', cwd } = {}) {
  const { stdout } = await execFileAsync(command, ['api', ...args], { cwd, maxBuffer: 10 * 1024 * 1024 });
  return JSON.parse(stdout);
}

export async function readGithubIssue(repo, number, options = {}) {
  if (!repo || !number) throw new Error('repo and issue number are required');
  const issueRecord = await ghJson([`repos/${repo}/issues/${number}`], options);
  return {
    schemaVersion: 1,
    workItem: { id: `GH-${issueRecord.number}`, title: issueRecord.title, type: issueRecord.pull_request ? 'pull-request' : 'issue', url: issueRecord.html_url, state: issueRecord.state },
    currentLabels: (issueRecord.labels ?? []).map((label) => typeof label === 'string' ? label : label.name).filter(Boolean).sort(),
    links: { url: issueRecord.html_url, parent: issueRecord.parent ?? null, subIssues: issueRecord.sub_issues ?? [] },
    dependencies: issueRecord.dependencies ?? [],
    source: { provider: 'github', repository: repo, number: issueRecord.number },
  };
}

export function mergeGithubTriage(issueRecord, assessment, configuration) {
  if (!issueRecord || typeof issueRecord !== 'object') return { errors: [issue('github.issue', 'issue metadata is required')] };
  if (!assessment || typeof assessment !== 'object') return { errors: [issue('github.assessment', 'structured assessment is required')] };
  return { ...issueRecord, assessment, configuration };
}

export async function replaceGithubLabels(repo, number, labels, options = {}) {
  if (!Array.isArray(labels)) throw new Error('labels must be an array');
  if (options.dryRun !== false) return { applied: false, labels: [...labels] };
  const { stdout } = await execFileAsync(options.command ?? 'gh', ['api', '--method', 'PUT', `repos/${repo}/issues/${number}/labels`, ...labels.flatMap((label) => ['-f', `labels[]=${label}`])], { cwd: options.cwd, maxBuffer: 10 * 1024 * 1024 });
  return { applied: true, labels: JSON.parse(stdout).map((label) => label.name).sort() };
}

export async function createGithubSubIssues(repo, parentNumber, plan, options = {}) {
  if (!plan?.canApply) throw new Error('Decomposition plan is not ready to apply. Resolve its errors first.');
  const operations = plan.order.map((id) => {
    const slice = plan.slices.find((candidate) => candidate.id === id);
    return { type: 'create-child-issue', parent: Number(parentNumber), sliceId: id, title: slice.title, body: `Parent issue: #${parentNumber}\n\nAcceptance evidence:\n${slice.acceptance.map((item) => `- ${item}`).join('\n')}` };
  });
  if (options.dryRun !== false) return { applied: false, operations };
  const created = [];
  for (const operation of operations) {
    const issueRecord = await ghJson(['--method', 'POST', `repos/${repo}/issues`, '-f', `title=${operation.title}`, '-f', `body=${operation.body}`], options);
    created.push({ ...operation, number: issueRecord.number, url: issueRecord.html_url });
  }
  return { applied: true, operations: created };
}
