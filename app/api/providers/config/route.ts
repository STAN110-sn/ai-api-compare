import { NextRequest, NextResponse } from 'next/server';
import { getProviderConfig } from '@/lib/providers';

export async function POST(request: NextRequest) {
  const { providerAId, providerBId } = await request.json();

  if (!providerAId || !providerBId) {
    return NextResponse.json(
      { error: 'Missing provider IDs' },
      { status: 400 }
    );
  }

  const providerA = getProviderConfig(providerAId);
  const providerB = getProviderConfig(providerBId);

  if (!providerA || !providerB) {
    return NextResponse.json(
      { error: 'Invalid provider configuration' },
      { status: 400 }
    );
  }

  return NextResponse.json({ providerA, providerB });
}
