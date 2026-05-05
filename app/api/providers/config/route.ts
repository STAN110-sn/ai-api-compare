import { NextRequest, NextResponse } from 'next/server';
import { getProviderConfig } from '@/lib/providers';

export async function POST(request: NextRequest) {
  const { providerAId, providerBId, modelAId, modelBId } = await request.json();

  if (!providerAId || !providerBId) {
    return NextResponse.json(
      { error: 'Missing provider IDs' },
      { status: 400 }
    );
  }

  const providerA = getProviderConfig(providerAId, modelAId);
  const providerB = getProviderConfig(providerBId, modelBId);

  if (!providerA || !providerB) {
    return NextResponse.json(
      { error: 'Invalid provider configuration' },
      { status: 400 }
    );
  }

  return NextResponse.json({ providerA, providerB });
}
