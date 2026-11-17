const ws = new WebSocket('ws://localhost:3055');

function queryFigma(method, params = {}, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const id = 'req-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    const timer = setTimeout(() => {
      reject(new Error(`Figma query ${method} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    const onMessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.id === id) {
          clearTimeout(timer);
          ws.removeEventListener('message', onMessage);
          resolve(msg.result);
        } else if (msg.type === 'error' && msg.id === id) {
          clearTimeout(timer);
          ws.removeEventListener('message', onMessage);
          reject(new Error(msg.error?.message || JSON.stringify(msg.error)));
        }
      } catch (err) {}
    };

    ws.addEventListener('message', onMessage);
    ws.send(JSON.stringify({ id, type: 'request', channel: 'design-1', method, params }));
  });
}

function printNodeTree(node, depth = 0) {
  const indent = '  '.repeat(depth);
  const fillInfo = node.fills?.map(f => f.color || f.type).join(', ') || '';
  const textInfo = node.characters ? ` "${node.characters.replace(/\n/g, ' ')}"` : '';
  const fontInfo = node.fontSize ? ` [font: ${node.fontSize}px / ${node.fontWeight || ''}]` : '';
  const layoutInfo = node.layoutMode ? ` [layout: ${node.layoutMode}, p:${node.paddingTop}/${node.paddingRight}/${node.paddingBottom}/${node.paddingLeft}, gap:${node.itemSpacing}]` : '';
  const bgInfo = fillInfo ? ` (fill: ${fillInfo})` : '';
  const radiusInfo = node.cornerRadius ? ` r:${node.cornerRadius}` : '';
  console.log(`${indent}- [${node.id}] ${node.type} "${node.name}" (${node.width}x${node.height})${bgInfo}${radiusInfo}${layoutInfo}${fontInfo}${textInfo}`);
  if (node.children) {
    for (const child of node.children) {
      printNodeTree(child, depth + 1);
    }
  }
}

ws.onopen = async () => {
  try {
    ws.send(JSON.stringify({ type: 'join', role: 'mcp', channel: 'design-1' }));
    await new Promise(r => setTimeout(r, 200));

    const nodeId = process.argv[2];
    if (!nodeId) {
      console.log('Provide nodeId');
      process.exit(1);
    }
    const maxDepth = parseInt(process.argv[3] || '4', 10);
    const node = await queryFigma('get_node_info', { nodeId, detail: 'full', maxDepth });
    printNodeTree(node);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    ws.close();
    process.exit(0);
  }
};
