const ws = new WebSocket('ws://localhost:3055');

function queryFigma(method, params = {}, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const id = 'req-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    const timer = setTimeout(() => {
      reject(new Error(`Figma query ${method} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    const onMessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'response' && msg.id === id) {
          clearTimeout(timer);
          ws.removeEventListener('message', onMessage);
          resolve(msg.result);
        } else if (msg.type === 'error' && msg.id === id) {
          clearTimeout(timer);
          ws.removeEventListener('message', onMessage);
          reject(new Error(msg.error?.message || JSON.stringify(msg.error)));
        }
      } catch (err) {
        // ignore JSON parse errors
      }
    };

    ws.addEventListener('message', onMessage);
    ws.send(JSON.stringify({
      id,
      type: 'request',
      channel: 'design-1',
      method,
      params
    }));
  });
}

ws.onopen = async () => {
  try {
    ws.send(JSON.stringify({ type: 'join', role: 'mcp', channel: 'design-1' }));
    // Wait for join
    await new Promise(r => setTimeout(r, 200));

    const command = process.argv[2] || 'page';
    if (command === 'page') {
      const pageNameOrId = process.argv[3];
      if (pageNameOrId) {
        await queryFigma('set_current_page', { nameOrId: pageNameOrId });
      }
      const pageInfo = await queryFigma('get_current_page', { maxDepth: 1, maxNodes: 100 });
      console.log('PAGE:', pageInfo.name, 'Total children:', pageInfo.childCount);
      for (const n of pageInfo.nodes) {
        console.log(`[${n.id}] "${n.name}" (${n.type}) - ${n.width}x${n.height} at (${n.x}, ${n.y})`);
      }
    } else if (command === 'children') {
      const nodeId = process.argv[3];
      const nodeInfo = await queryFigma('get_node_info', { nodeId, detail: 'standard', maxDepth: 2 });
      console.log('NODE:', nodeInfo.name, `(${nodeInfo.type})`);
      console.log('Keys:', Object.keys(nodeInfo));
      if (nodeInfo.children) {
        console.log('Children count:', nodeInfo.children.length);
        for (const c of nodeInfo.children) {
          console.log(`  [${c.id}] "${c.name}" (${c.type}) - ${c.width}x${c.height} at (${c.x}, ${c.y})`);
        }
      }
    } else if (command === 'node') {
      const nodeId = process.argv[3];
      const detail = process.argv[4] || 'standard';
      const nodeInfo = await queryFigma('get_node_info', { nodeId, detail, maxDepth: 4 });
      console.log(JSON.stringify(nodeInfo, null, 2));
    } else if (command === 'search') {
      const query = process.argv[3] || '';
      const results = await queryFigma('search_nodes', { query, limit: 100 });
      console.log(JSON.stringify(results, null, 2));
    } else if (command === 'design_context') {
      const nodeId = process.argv[3];
      const ctx = await queryFigma('get_design_context', { nodeId, framework: 'react' });
      console.log(JSON.stringify(ctx, null, 2));
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    ws.close();
    process.exit(0);
  }
};
