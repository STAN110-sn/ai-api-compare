import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { ProviderConfig, ReasoningEffort, StreamChunk } from '@/lib/types';

async function* streamFromProvider(
  provider: ProviderConfig,
  providerLabel: 'A' | 'B',
  prompt: string,
  reasoningEffort?: ReasoningEffort
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
      ...(reasoningEffort ? { reasoning_effort: reasoningEffort } : {}),
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta as
        | { content?: string; reasoning?: string; reasoning_content?: string }
        | undefined;
      const contentDelta = delta?.content || '';
      const reasoningDelta = delta?.reasoning || delta?.reasoning_content || '';

      if (contentDelta) {
        content += contentDelta;
        yield { provider: providerLabel, content: contentDelta };
      }
      if (reasoningDelta) {
        yield { provider: providerLabel, reasoning: reasoningDelta };
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

async function* mergeStreams<A, B>(
  genA: AsyncGenerator<A>,
  genB: AsyncGenerator<B>
): AsyncGenerator<A | B> {
  const itA = genA[Symbol.asyncIterator]();
  const itB = genB[Symbol.asyncIterator]();
  type Tagged = { tag: 'A' | 'B'; result: IteratorResult<A | B> };
  const pull = (
    it: AsyncIterator<A | B>,
    tag: 'A' | 'B'
  ): Promise<Tagged> => it.next().then((result) => ({ tag, result }));

  let pA: Promise<Tagged> | null = pull(itA, 'A');
  let pB: Promise<Tagged> | null = pull(itB, 'B');

  while (pA || pB) {
    const pending = [pA, pB].filter(
      (p): p is Promise<Tagged> => p !== null
    );
    const winner = await Promise.race(pending);
    if (winner.tag === 'A') {
      if (winner.result.done) {
        pA = null;
      } else {
        yield winner.result.value;
        pA = pull(itA, 'A');
      }
    } else {
      if (winner.result.done) {
        pB = null;
      } else {
        yield winner.result.value;
        pB = pull(itB, 'B');
      }
    }
  }
}

export async function POST(request: NextRequest) {
  const { prompt, providerA, providerB, reasoningEffortA, reasoningEffortB } =
    await request.json();

  if (!prompt || !providerA || !providerB) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const streamA = streamFromProvider(providerA, 'A', prompt, reasoningEffortA);
      const streamB = streamFromProvider(providerB, 'B', prompt, reasoningEffortB);

      for await (const chunk of mergeStreams(streamA, streamB)) {
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
