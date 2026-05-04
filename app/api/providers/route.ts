import { NextResponse } from 'next/server';
import { getAvailableProviders } from '@/lib/providers';

export async function GET() {
  const providers = getAvailableProviders();
  return NextResponse.json({ providers });
}
