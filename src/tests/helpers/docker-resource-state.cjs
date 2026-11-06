// Stateful Docker metadata for adapter subprocess tests; deletion itself enforces no ownership policy.
module.exports = args => {
  const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
  const file = path.join(path.dirname(process.argv[1]), '.docker-resource-state.json');
  const read = () => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
  const write = rows => {
    // Inventory reads can overlap the foreground container's exit handler.
    const staging = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(staging, JSON.stringify(rows));
    fs.renameSync(staging, file);
  };
  const type = args[0] === 'run' ? 'container' : args[0] === 'network' && args[1] === 'create' ? 'network' : null;
  if (type) {
    const declared = args[args.indexOf('--label') + 1];
    if (!declared?.startsWith('io.lighthouse.execution=')) return;
    const name = type === 'container' ? args[args.indexOf('--name') + 1] : args.at(-1);
    const row = { type, name, owner: declared.split('=')[1], id: crypto.createHash('sha256').update(name).digest('hex') };
    write([...read().filter(item => item.type !== type || item.name !== name), row]);
    if (type === 'container' && args.includes('--rm')) process.once('exit', () => write(read().filter(item => item.id !== row.id)));
    return;
  }
  if (args[1] === 'ls') {
    const filter = args[args.indexOf('--filter') + 1];
    process.stdout.write(read().filter(row => row.type === args[0] && (filter.startsWith('name=') ? new RegExp(filter.slice(5)).test(row.name) : filter === 'label=io.lighthouse.execution' ? row.owner : row.owner === filter.split('=').at(-1))).map(row => row.id).join('\n')); return;
  }
  if (args[1] === 'inspect') { process.stdout.write(read().filter(row => row.type === args[0] && args.includes(row.id)).map(row => JSON.stringify(row)).join('\n')); return; }
  if (args[0] === 'rm' || args[1] === 'rm') write(read().filter(row => !args.includes(row.name) && !args.includes(row.id)));
};
