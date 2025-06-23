// 存储所有活跃的SSE连接
const connections = new Set<ReadableStreamDefaultController>();

// 向所有连接的客户端推送事件
export function broadcastNewRequest(requestData: unknown) {
  const message = `data: ${JSON.stringify({ type: 'new-request', data: requestData })}\n\n`;
  
  connections.forEach((controller) => {
    try {
      controller.enqueue(new TextEncoder().encode(message));
    } catch {
      // 如果连接已关闭，从集合中移除
      connections.delete(controller);
    }
  });
}

// 添加连接
export function addConnection(controller: ReadableStreamDefaultController) {
  connections.add(controller);
}

// 移除连接
export function removeConnection(controller: ReadableStreamDefaultController) {
  connections.delete(controller);
} 