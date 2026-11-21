import { lstat, readFile, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { relative, resolve, sep } from 'node:path';

const guidePath = 'docs/design/DESIGN.md';
const skillPath = '.agents/skills/lighthouse-ui/SKILL.md';
const uiName = '@juangcarmona/lighthouse-ui';
const hash = (text) => createHash('sha256').update(text).digest('hex');
const object = (value) => value && typeof value === 'object' && !Array.isArray(value);
const text = (value) => typeof value === 'string' && value.trim().length > 0;
const sourcePath = (value) => text(value) && /^[A-Za-z0-9_/-]+(?:[.][A-Za-z0-9_-]+)*[.]css$/u.test(value)
  && !value.startsWith('/') && value.split('/').every(part => part && part !== '..' && !part.startsWith('.') && part !== 'node_modules');
const exactKeys = (value, keys) => object(value) && Object.keys(value).every(key => keys.includes(key));
const globals = /^(?:inherit|initial|unset|revert|revert-layer)$/iu;
const structural = new Set(`display position inset top right bottom left z-index width min-width max-width height min-height max-height inline-size min-inline-size max-inline-size block-size min-block-size max-block-size margin margin-top margin-right margin-bottom margin-left margin-inline margin-block margin-inline-start margin-inline-end padding padding-top padding-right padding-bottom padding-left padding-inline padding-block padding-inline-start padding-inline-end gap row-gap column-gap grid grid-template-columns grid-template-rows grid-column grid-row grid-auto-flow grid-auto-columns grid-auto-rows align-items align-content align-self justify-items justify-content justify-self place-items place-content flex flex-direction flex-wrap flex-grow flex-shrink flex-basis order overflow overflow-x overflow-y box-sizing aspect-ratio object-fit object-position cursor pointer-events visibility white-space text-align text-transform text-overflow overflow-wrap word-break list-style list-style-type table-layout border-collapse border-spacing border-width border-style outline-width outline-style outline-offset opacity color-scheme content font-weight font-style vertical-align isolation appearance resize user-select touch-action`.split(' '));
const presentation = new Set(`text-decoration color background background-color border-color border-top-color border-right-color border-bottom-color border-left-color outline-color fill stroke caret-color accent-color font-family font-size line-height letter-spacing border-radius border-top-left-radius border-top-right-radius border-bottom-left-radius border-bottom-right-radius box-shadow text-shadow transition transition-duration transition-delay animation-duration animation-delay`.split(' '));
const borders = new Set(['border', 'border-top', 'border-right', 'border-bottom', 'border-left', 'outline']);
const functions = new Set(['var', 'calc', 'min', 'max', 'clamp', 'repeat', 'minmax', 'fit-content', 'rgb', 'rgba', 'hsl', 'hsla']);

export function validateSemanticTokenConfig(config) {
  const problems = [];
  if (!exactKeys(config, ['enabled', 'files', 'exclude', 'exceptions']) || typeof config.enabled !== 'boolean') return ['semanticTokens must declare enabled and only files, exclude and exceptions'];
  if (!config.enabled) return problems;
  if (!Array.isArray(config.files) || config.files.some(path => !sourcePath(path)) || new Set(config.files).size !== config.files.length) return ['files must be unique exact relative standalone .css source paths (no globs, hidden or dependency directories)'];
  if (config.exclude !== undefined && (!Array.isArray(config.exclude) || config.exclude.some(entry => !exactKeys(entry, ['path', 'reason']) || !text(entry.path) || !text(entry.reason) || !config.files.includes(entry.path)) || new Set(config.exclude.map(entry => entry.path)).size !== config.exclude.length)) problems.push('exclude entries require a unique inventoried path and reason');
  if (config.exceptions !== undefined && (!Array.isArray(config.exceptions) || config.exceptions.some(entry => !exactKeys(entry, ['path', 'property', 'value', 'selector', 'role', 'reason', 'owner', 'review'])
    || !sourcePath(entry.path) || !config.files.includes(entry.path) || !text(entry.property) || !text(entry.value) || !text(entry.reason) || !text(entry.owner)
    || !/^\d{4}-\d{2}-\d{2}$/u.test(entry.review ?? '') || !Number.isFinite(Date.parse(`${entry.review}T00:00:00Z`)) || new Date(`${entry.review}T00:00:00Z`).toISOString().slice(0, 10) !== entry.review
    || ('selector' in entry && !text(entry.selector)) || ('role' in entry && !/^--lh-[a-z0-9-]+$/u.test(entry.role))))) problems.push('exceptions require exact inventory path/property/value, reason, owner and review date; selector and role only narrow scope');
  return problems;
}

// The guide's bounded metadata is deliberately not a general YAML interpreter.
function metadata(guide) {
  const frontmatter = guide.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u)?.[1];
  if (!frontmatter) throw new Error('adopted guide has missing visual authority metadata');
  const one = (key) => {
    const matches = [...frontmatter.matchAll(new RegExp(`^${key}:\\s*(.+)$`, 'gmu'))];
    if (matches.length !== 1) throw new Error(`adopted guide has missing or ambiguous ${key} metadata`);
    return matches[0][1].trim();
  };
  if (one('source') !== './tokens.css' || one('tokenPrefix') !== "'--lh-'" || !/^\s+ui: ['"]?@juangcarmona\/lighthouse-ui['"]?\s*$/mu.test(frontmatter)) throw new Error('adopted guide source/package/tokenPrefix metadata is unsupported or drifted');
  if ([...frontmatter.matchAll(/^\s+ui:/gmu)].length !== 1) throw new Error('adopted guide has ambiguous UI package metadata');
  const primitiveText = one('primitiveTokens');
  if (!/^\[(?:--lh-[a-z0-9-]+(?:,\s*)?)+\]$/u.test(primitiveText)) throw new Error('adopted guide primitiveTokens metadata is unsupported');
  const primitives = primitiveText.slice(1, -1).split(',').map(value => value.trim());
  if (new Set(primitives).size !== primitives.length) throw new Error('adopted guide has ambiguous primitiveTokens metadata');
  return primitives;
}

export async function resolveVisualAuthority({ root, manifest, managedFiles, installed }) {
  if (!manifest.profiles?.includes('visual-theme')) throw new Error('semanticTokens requires the adopted visual-theme profile');
  if (!installed || installed.name !== uiName || manifest.packages?.ui?.name !== uiName || installed.version !== manifest.packages.ui.version) throw new Error('installed UI package identity is missing or drifted from packages.ui; review lighthouse upgrade');
  const state = JSON.parse(await readFile(resolve(root, '.lighthouse/upgrade.json'), 'utf8'));
  if (state.schemaVersion !== 1 || state.package?.name !== '@juangcarmona/lighthouse') throw new Error('visual ownership metadata is missing or unsupported; review lighthouse reconcile');
  for (const path of [guidePath, skillPath]) {
    if (!manifest.managed?.includes(path) || !text(managedFiles[path])) throw new Error(`${path} is not an adopted managed visual projection`);
    const current = await readFile(resolve(root, path), 'utf8');
    if (current !== managedFiles[path] || state.files?.[path]?.hash !== hash(current)) throw new Error(`${path} has drifted or lacks current upgrade ownership; review lighthouse upgrade`);
  }
  const primitives = metadata(managedFiles[guidePath]);
  if (!text(installed.tokens)) throw new Error('installed UI token export is missing');
  const definitions = [...installed.tokens.matchAll(/(--lh-[a-z0-9-]+)\s*:/gu)].map(match => match[1]);
  const roles = new Set(definitions);
  if (primitives.some(role => !roles.has(role)) || ['--lh-canvas', '--lh-surface', '--lh-text', '--lh-action', '--lh-border', '--lh-focus'].some(role => !roles.has(role))) throw new Error('installed token export and guide roles are missing or inconsistent');
  return { roles, primitives: new Set(primitives), evidence: { guide: guidePath, skill: skillPath, package: { name: installed.name, version: installed.version }, source: installed.source, tokenHash: hash(installed.tokens), guideHash: hash(managedFiles[guidePath]) } };
}

// Mask comments and strings without changing offsets. Strings can contain CSS-looking text.
function masked(source) {
  let output = '', quote = null, comment = false;
  for (let i = 0; i < source.length; i += 1) {
    const c = source[i], next = source[i + 1];
    if (comment) { if (c === '*' && next === '/') { output += '  '; i += 1; comment = false; } else output += c === '\n' ? '\n' : ' '; }
    else if (quote) { if (c === '\\') { output += '  '; i += 1; } else { if (c === quote) quote = null; output += c === '\n' ? '\n' : ' '; } }
    else if (c === '/' && next === '*') { comment = true; output += '  '; i += 1; }
    else if (c === '"' || c === "'") { quote = c; output += 'S'; }
    else output += c;
  }
  return { value: output, incomplete: comment || quote !== null };
}

export function inspectCss(source, { path, roles, primitives, exceptions = [] }) {
  const diagnostics = [], limitations = [], usedExceptions = [];
  const mask = masked(source), css = mask.value;
  const add = (list, code, message, offset = 0) => list.push({ path, line: source.slice(0, offset).split('\n').length, code, message });
  if (source.includes('\u0000')) add(limitations, 'unsupported-syntax', 'Null characters are outside standalone CSS coverage');
  if (mask.incomplete) add(limitations, 'unsupported-syntax', 'Unterminated comment or string');
  if (/\\|\$\{|#\{/u.test(css)) add(limitations, 'unsupported-syntax', 'Escapes and template interpolation are outside standalone CSS coverage');

  function declaration(segment, offset, selector) {
    const match = segment.match(/^\s*(--[a-zA-Z0-9_-]+|[a-zA-Z-]+)\s*:\s*([\s\S]*?)\s*$/u);
    if (!match || !match[2]) { if (segment.trim()) add(limitations, 'unsupported-declaration', 'Expected a supported property: value declaration', offset); return; }
    const property = match[1].startsWith('--') ? match[1] : match[1].toLowerCase();
    const colon = segment.indexOf(':');
    const original = source.slice(offset + colon + 1, offset + segment.length).trim();
    let value = match[2].replace(/\s*!important\s*$/iu, '').trim();
    const custom = property.startsWith('--');
    const enforced = presentation.has(property) || borders.has(property) || custom;
    if (!enforced && !structural.has(property)) add(limitations, 'unsupported-property', `Property ${property} is outside the supported inventory`, offset);
    const exception = exceptions.find(entry => entry.path === path && entry.property === property && entry.value === original && (!entry.selector || entry.selector === selector) && (!entry.role || entry.role === property));
    // Validate all semantic names independently of raw-value exceptions and property class.
    for (const token of value.match(/--lh-[a-zA-Z0-9_-]+/gu) ?? []) {
      if (!roles.has(token)) add(diagnostics, 'undefined-role', `Undefined semantic role ${token}`, offset);
      else if (primitives.has(token)) add(diagnostics, 'primitive-reference', `Primitive ${token} is not a consumer semantic role`, offset);
    }
    if (custom && property.startsWith('--lh-') && !roles.has(property)) add(diagnostics, 'undefined-role', `Undefined override role ${property}`, offset);
    if (custom && primitives.has(property)) add(diagnostics, 'primitive-reference', `Primitive definition ${property} belongs to canonical tokens`, offset);
    if (custom && !property.startsWith('--lh-')) add(limitations, 'unsupported-alias', 'Product custom-property alias definitions are not evaluated', offset);
    for (const fn of value.matchAll(/([a-zA-Z-]+)\s*\(/gu)) if (!functions.has(fn[1].toLowerCase())) add(limitations, 'unsupported-function', `Function ${fn[1]} is outside the supported value grammar`, offset);

    function references(input) {
      let result = '', cursor = 0;
      const regex = /var\s*\(/giu;
      for (let found = regex.exec(input); found; found = regex.exec(input)) {
        result += input.slice(cursor, found.index);
        let depth = 1, end = regex.lastIndex, comma = -1;
        for (; end < input.length && depth; end += 1) {
          if (input[end] === '(') depth += 1;
          else if (input[end] === ')') depth -= 1;
          else if (input[end] === ',' && depth === 1 && comma < 0) comma = end;
        }
        if (depth) { add(limitations, 'unsupported-syntax', 'Unbalanced var() function', offset); return ''; }
        const name = input.slice(regex.lastIndex, comma < 0 ? end - 1 : comma).trim();
        if (!/^--lh-[a-zA-Z0-9_-]+$/u.test(name)) add(limitations, 'unresolved-reference', `Non-authoritative or malformed variable ${name}`, offset);
        if (comma >= 0) {
          const fallback = references(input.slice(comma + 1, end - 1));
          if (enforced && !allowed(fallback, property)) raw('Prohibited raw fallback');
        }
        // Raw CSS nulls are rejected above, so authored identifiers cannot impersonate references.
        result += '\u0000'; cursor = end; regex.lastIndex = end;
      }
      return result + input.slice(cursor);
    }
    function raw(message) {
      if (exception) { if (!usedExceptions.includes(exception)) usedExceptions.push(exception); }
      else add(diagnostics, custom ? 'product-override' : 'raw-presentation', `${message} in ${property}; use semantic roles or an exact reviewed exception`, offset);
    }
    value = references(value);
    if (custom) { if (!exception) raw('Product token definitions require a scoped exception'); else if (!usedExceptions.includes(exception)) usedExceptions.push(exception); }
    else if (enforced && !allowed(value, property)) raw('Prohibited raw presentation value');
  }

  function allowed(value, property) {
    value = value.trim();
    if (globals.test(value) || /^(?:\u0000\s*)+$/u.test(value)) return true;
    if (property === 'font-family') return false;
    if (/^(?:transparent|currentColor)$/iu.test(value)
      && (property === 'color' || property === 'background' || property.endsWith('-color') || ['fill', 'stroke'].includes(property))) return true;
    if (value === 'none' && ['background', 'fill', 'stroke', 'box-shadow', 'text-shadow', 'transition'].includes(property)) return true;
    if (value === '0' && ['font-size', 'line-height', 'letter-spacing', 'border-radius', 'border-top-left-radius', 'border-top-right-radius', 'border-bottom-left-radius', 'border-bottom-right-radius'].includes(property)) return true;
    if (borders.has(property)) return /^(?:(?:\u0000|0|\d+(?:\.\d+)?px|solid|dashed|dotted|double|none)\s*)+$/u.test(value) && /\u0000|^0$|^none$/u.test(value);
    if (property === 'text-decoration') return /^(?:(?:\u0000|underline|overline|line-through|none|solid|double|dotted|dashed|wavy|auto|from-font|currentColor|transparent)\s*)+$/iu.test(value);
    if (property === 'transition') return /^(?:(?:\u0000|color|background-color|border-color|opacity|transform|ease|ease-in|ease-out|ease-in-out|linear)\s*[, ]?\s*)+$/u.test(value);
    return false;
  }

  // Split blocks only outside parentheses/brackets; delimiters in comments/strings are masked.
  function block(start, end, selector = null) {
    let cursor = start, parens = 0, brackets = 0;
    for (let i = start; i < end; i += 1) {
      const c = css[i];
      if (c === '(') parens += 1;
      else if (c === ')') parens -= 1;
      else if (c === '[') brackets += 1;
      else if (c === ']') brackets -= 1;
      if (parens < 0 || brackets < 0) { add(limitations, 'unsupported-syntax', 'Unbalanced value delimiters', i); return; }
      if (parens || brackets) continue;
      if (c === ';') {
        const segment = css.slice(cursor, i);
        if (selector !== null) declaration(segment, cursor, selector);
        else if (segment.trim()) add(limitations, segment.trim().startsWith('@import') ? 'unresolved-import' : 'unsupported-syntax', 'Top-level statements/imports are not followed; inventory their source separately', cursor);
        cursor = i + 1;
      } else if (c === '{') {
        const header = css.slice(cursor, i).trim();
        let depth = 1, close = i + 1;
        for (; close < end && depth; close += 1) { if (css[close] === '{') depth += 1; else if (css[close] === '}') depth -= 1; }
        if (depth) { add(limitations, 'unsupported-syntax', 'Unclosed CSS block', i); return; }
        if (selector !== null) add(limitations, 'unsupported-nesting', 'Nested rules are outside the supported standalone grammar', cursor);
        else if (/^@(media|supports|layer)\b/iu.test(header)) block(i + 1, close - 1);
        else if (header.startsWith('@') || !header || /[&;]/u.test(header)) add(limitations, 'unsupported-syntax', `Unsupported rule ${header}`, cursor);
        else block(i + 1, close - 1, source.slice(cursor + css.slice(cursor, i).search(/\S/u), i).trim());
        i = close - 1; cursor = close;
      } else if (c === '}') { add(limitations, 'unsupported-syntax', 'Unexpected closing block', i); return; }
    }
    if (parens || brackets) add(limitations, 'unsupported-syntax', 'Unbalanced value delimiters', cursor);
    if (css.slice(cursor, end).trim()) {
      if (selector !== null) declaration(css.slice(cursor, end), cursor, selector);
      else add(limitations, 'unsupported-syntax', 'Uninspected top-level content', cursor);
    }
  }
  block(0, css.length);
  return { diagnostics, limitations, usedExceptions };
}

export async function checkSemanticTokens({ root, manifest, managedFiles, installed }) {
  const config = manifest?.semanticTokens;
  const coverage = { inspected: [], excluded: [], limitations: [], uninspected: ['inline styles', 'HTML/template style blocks', 'CSS-in-JS', 'sources not declared in semanticTokens.files'] };
  if (config === undefined || (object(config) && config.enabled === false)) return { status: 'not-applicable', problems: [], evidence: [], coverage };
  const problems = validateSemanticTokenConfig(config);
  if (problems.length) return { status: 'failed', problems, evidence: [], coverage };
  let authority;
  try { authority = await resolveVisualAuthority({ root, manifest, managedFiles, installed }); }
  catch (error) { return { status: 'failed', problems: [`Visual authority unavailable: ${error.message}`], evidence: [], coverage }; }
  const diagnostics = [], usedExceptions = [];
  for (const path of config.files) {
    const excluded = config.exclude?.find(entry => entry.path === path);
    if (excluded) { coverage.excluded.push(excluded); continue; }
    if (path.split('/').some(part => ['dist', 'build', 'coverage'].includes(part)) || /[.]min[.]css$/u.test(path)) {
      coverage.excluded.push({ path, reason: 'Generated/minified inputs require an explicit reasoned exclusion and source inventory' });
      problems.push(`${path}: declare a reasoned generated-input exclusion and inventory its authored sources`);
      continue;
    }
    try {
      const absolute = resolve(root, path), actual = await realpath(absolute), rel = relative(await realpath(root), actual);
      if (rel.startsWith(`..${sep}`) || rel === '..' || resolve(root, rel) !== absolute || !(await lstat(absolute)).isFile()) throw new Error('source must be a regular non-symlink file inside the adopter');
      const source = await readFile(absolute, 'utf8');
      const inspected = inspectCss(source, { path, ...authority, exceptions: config.exceptions });
      coverage.inspected.push({ path, hash: hash(source) });
      diagnostics.push(...inspected.diagnostics); coverage.limitations.push(...inspected.limitations); usedExceptions.push(...inspected.usedExceptions);
    } catch (error) { problems.push(`${path}: ${error.message}`); }
  }
  if (!coverage.inspected.length) problems.push('No standalone CSS files inspected; declare a non-empty eligible source inventory');
  problems.push(...diagnostics.map(item => `${item.path}:${item.line}: ${item.code}: ${item.message}`), ...coverage.limitations.map(item => `${item.path}:${item.line}: coverage limitation (${item.code}): ${item.message}`));
  return { status: problems.length ? 'failed' : 'passed', problems, diagnostics, evidence: [authority.evidence, ...usedExceptions.map(exception => ({ exception }))], coverage };
}
