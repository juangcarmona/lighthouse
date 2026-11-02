import { connect } from 'node:net';
const socket = connect('/codegraph/codegraph.sock');
socket.on('error', () => process.exit(1));
process.stdin.pipe(socket).pipe(process.stdout);
