import { kv } from '@vercel/kv';
import { nanoid } from 'nanoid';
import { NextRequest, NextResponse } from 'next/server';
import { broadcastNewRequest } from '../../events/route';

async function handler(req: NextRequest) {
  const start = Date.now();
  const requestId = nanoid();
  const method = req.method;
  const url = req.url;
  const headers = Object.fromEntries(req.headers.entries());
  let body: any = null;

  try {
    if (req.body) {
      const contentType = req.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        body = await req.json();
      } else if (contentType && contentType.includes('application/x-www-form-urlencoded')) {
        const formData = await req.formData();
        body = Object.fromEntries(formData.entries());
      } else {
        body = await req.text();
      }
    }
  } catch (error) {
    console.error('Error parsing body:', error);
    body = 'Could not parse body';
  }

  const requestData = {
    id: requestId,
    timestamp: start,
    method,
    url,
    headers,
    body,
  };

  await kv.zadd('requests', { score: start, member: requestId });
  await kv.hset(`req:${requestId}`, requestData);

  // 向所有连接的客户端推送新请求事件
  broadcastNewRequest(requestData);

  return NextResponse.json({
    message: 'Request captured',
    requestId,
  });
}

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE, handler as HEAD, handler as OPTIONS }; 