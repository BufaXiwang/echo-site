import { NextRequest } from 'next/server';
import { addConnection, removeConnection } from '@/lib/broadcast';

export async function GET(request: NextRequest) {
  // 创建一个可读流用于SSE
  const stream = new ReadableStream({
    start(controller) {
      // 添加到连接集合
      addConnection(controller);
      
      // 发送初始连接确认
      const welcomeMessage = `data: ${JSON.stringify({ type: 'connected', message: 'SSE connection established' })}\n\n`;
      controller.enqueue(new TextEncoder().encode(welcomeMessage));
      
      // 设置心跳，每30秒发送一次
      const heartbeat = setInterval(() => {
        try {
          const heartbeatMessage = `data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`;
          controller.enqueue(new TextEncoder().encode(heartbeatMessage));
        } catch {
          clearInterval(heartbeat);
          removeConnection(controller);
        }
      }, 30000);
      
      // 清理函数
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        removeConnection(controller);
        controller.close();
      });
    },
    cancel() {
      // 连接关闭时清理
      // this 在这个上下文中指向 controller，但类型系统无法推断
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
} 