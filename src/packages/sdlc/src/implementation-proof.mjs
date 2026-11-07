import { checkImplementationPullRequest } from './proposal-review.mjs';

const marker = /<!-- lighthouse-pr-state:(\{[^\n]*\}) -->/;

export function implementationPrProof(comments, pr) {
  for (const comment of [...comments].reverse()) {
    if (comment.user?.login !== 'github-actions[bot]' || comment.user.type !== 'Bot') continue;
    const raw = comment.body?.match(marker)?.[1];
    if (!raw) continue;
    let proof;
    try { proof = JSON.parse(raw); } catch { continue; }
    if (proof.pr === pr.number && proof.head === pr.head.sha && typeof proof.complete === 'boolean' && /^[1-9][0-9]*$/.test(String(proof.run))) {
      if (proof.implementationIdentity && proof.implementationIdentity !== checkImplementationPullRequest(pr, pr.head.repo.full_name).implementationIdentity) return null;
      return proof;
    }
  }
  return null;
}
