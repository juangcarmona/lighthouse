import { nativeEventFile, openCodeObserver } from '../telemetry-opencode.mjs';

export default {
  id: 'lighthouse-telemetry',
  async setup(ctx) {
    const path = process.env.LIGHTHOUSE_NATIVE_TELEMETRY_FILE;
    if (!path) return;
    const sink = nativeEventFile(path), controller = new AbortController();
    const observe = openCodeObserver(sink.write);
    sink.write('collection.native-started', { adapter: 'opencode-2.1', status: 'connected' });
    const loop = (async () => {
      try { for await (const event of ctx.event.subscribe({ signal: controller.signal })) observe(event); }
      catch { if (!controller.signal.aborted) sink.write('collection.gap', { reasonCode: 'native-disconnected' }); }
    })();
    return async () => { controller.abort(); await loop; sink.close(); };
  },
};
