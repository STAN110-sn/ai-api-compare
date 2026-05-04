import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { ProviderConfig, StreamChunk } from '@/lib/types';

async function* streamFromProvider(
  provider: ProviderConfig,
  providerLabel: 'A' | 'B',
  prompt: string
): AsyncGenerator<StreamChunk> {
  const startTime = Date.now();
  let content = '';
  let totalTokens = 0;
  let promptTokens = 0;
  let completionTokens = 0;

  try {
    const client = new OpenAI({
      apiKey: provider.apiKey,
      baseURL: provider.baseUrl,
    });

    const stream = await client.chat.completions.create({
      model: provider.model,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
      stream_options: { include_usage: true },
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      if (delta) {
        content += delta;
        yield {
          provider: providerLabel,
          content: delta,
        };
      }

      if (chunk.usage) {
        totalTokens = chunk.usage.total_tokens || 0;
        promptTokens = chunk.usage.prompt_tokens || 0;
        completionTokens = chunk.usage.completion_tokens || 0;
      }
    }

    const latency = Date.now() - startTime;

    yield {
      provider: providerLabel,
      done: true,
      latency,
      tokens: {
        total: totalTokens,
        prompt: promptTokens,
        completion: completionTokens,
      },
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    yield {
      provider: providerLabel,
      error: error instanceof Error ? error.message : 'Unknown error',
      done: true,
      latency,
      tokens: {
        total: totalTokens,
        prompt: promptTokens,
        completion: completionTokens,
      },
    };
  }
}

async function* combineStreams<A, B>(
  genA: AsyncGenerator<A>,
  genB: AsyncGenerator<B>
): AsyncGenerator<A | B> {
  const iteratorA = genA[Symbol.asyncIterator]();
  const iteratorB = genB[Symbol.asyncIterator]();

  let resultA = await iteratorA.next();
  let resultB = await iteratorB.next();

  while (!resultA.done || !resultB.done) {
    if (!resultA.done) {
      yield resultA.value;
      resultA = await iteratorA.next();
    }
    if (!resultB.done) {
      yield resultB.value;
      resultB = await iteratorB.next();
    }
  }
}

export async function POST(request: NextRequest) {
  const { prompt, providerA, providerB } = await request.json();

  if (!prompt || !providerA || !providerB) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const streamA = streamFromProvider(providerA, 'A', prompt);
      const streamB = streamFromProvider(providerB, 'B', prompt);

      for await (const chunk of combineStreams(streamA, streamB)) {
        const data = `data: ${JSON.stringify(chunk)}\n\n`;
        controller.enqueue(encoder.encode(data));
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
