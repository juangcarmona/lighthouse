export const changeName = issue => {
  if (!Number.isSafeInteger(issue) || issue < 1) throw Error('Invalid proposal issue');
  return `issue-${issue}-proposal`;
};
export const proposalRoot = issue => `openspec/changes/${changeName(issue)}`;

export function validateProposalFiles(files, issue) {
  const root = proposalRoot(issue), seen = new Set();
  if (!Array.isArray(files) || files.length > 24) throw Error('Proposal needs at most 24 bounded files');
  let bytes = 0;
  for (const file of files) {
    if (!file || Object.keys(file).sort().join(',') !== 'content,path' || typeof file.path !== 'string' || typeof file.content !== 'string') throw Error('Invalid proposal file');
    const relative = file.path.slice(root.length + 1);
    if (!file.path.startsWith(`${root}/`) || !/^(\.openspec\.yaml|proposal\.md|design\.md|tasks\.md|specs\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*\/spec\.md)$/.test(relative)) throw Error('Proposal write outside authorized Markdown paths');
    if (relative === '.openspec.yaml' && file.content.trim() !== 'skip_specs: true') throw Error('Proposal metadata may only declare skip_specs: true');
    if (seen.has(file.path) || !file.content.trim() || file.content.includes('\0')) throw Error('Duplicate or empty proposal file');
    seen.add(file.path); bytes += Buffer.byteLength(file.content);
    if (bytes > 96000) throw Error('Proposal exceeds 96000 bytes');
  }
  for (const name of ['proposal.md', 'design.md', 'tasks.md']) if (!seen.has(`${root}/${name}`)) throw Error(`Missing ${name}`);
  const hasSpec = [...seen].some(path => path.startsWith(`${root}/specs/`));
  const skipsSpecs = seen.has(`${root}/.openspec.yaml`);
  if (hasSpec === skipsSpecs) throw Error('Proposal needs specifications or an explicit docs-only skip_specs declaration');
  const tasks = files.find(file => file.path === `${root}/tasks.md`).content;
  if (!/^- \[ \] /m.test(tasks) || /^\s*[-*] \[[xX]\]/m.test(tasks)) throw Error('Proposal tasks must be pending implementation');
  return files;
}
