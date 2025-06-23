import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

export const revalidate = 0;

export async function GET() {
  try {
    const requestIds = await kv.zrange('requests', 0, -1, { rev: true, count: 50, offset: 0 });

    if (!requestIds || requestIds.length === 0) {
      return NextResponse.json([]);
    }

    const pipeline = kv.pipeline();
    requestIds.forEach((id) => {
      pipeline.hgetall(`req:${id}`);
    });

    const requests = await pipeline.exec();

    return NextResponse.json(requests.filter(Boolean));
  } catch (error) {
    console.error('Failed to fetch requests:', error);
    return NextResponse.json({ message: 'Failed to fetch requests' }, { status: 500 });
  }
} 