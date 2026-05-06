import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { ProviderConfig, ReasoningEffort, StreamChunk } from '@/lib/types';

const EFFORT_TO_BUDGET_TOKENS: Record<ReasoningEffort, number> = {
  low: 2_000,
  medium: 8_000,
  high: 16_000,
};

const ANTHROPIC_BASE_OUTPUT_TOKENS = 4_096;

function isAnthropicProvider(provider: ProviderConfig): boolean {
  try {
    const host = new URL(provider.baseUrl).hostname.toLowerCase();
    return host === 'api.anthropic.com' || host.endsWith('.anthropic.com');
  } catch {
    return false;
  }
}

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

async function* streamFromAnthropic(
  provider: ProviderConfig,
  providerLabel: 'A' | 'B',
  prompt: string,
  reasoningEffort?: ReasoningEffort
): AsyncGenerator<StreamChunk> {
  const startTime = Date.now();
  let promptTokens = 0;
  let completionTokens = 0;

  try {
    // Anthropic SDK appends /v1/* paths itself. The OpenAI-compat baseUrl ends
    // in /v1, so strip it before handing it to the native SDK.
    const baseUrl = provider.baseUrl.replace(/\/v1\/?$/, '');
    const client = new Anthropic({
      apiKey: provider.apiKey,
      baseURL: baseUrl,
    });

    const budget = reasoningEffort
      ? EFFORT_TO_BUDGET_TOKENS[reasoningEffort]
      : 0;
    // When extended thinking is enabled, max_tokens must exceed budget_tokens.
    const maxTokens = budget + ANTHROPIC_BASE_OUTPUT_TOKENS;

    const stream = client.messages.stream({
      model: provider.model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
      ...(reasoningEffort
        ? { thinking: { type: 'enabled' as const, budget_tokens: budget } }
        : {}),
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        const delta = event.delta;
        if (delta.type === 'text_delta') {
          if (delta.text) {
            yield { provider: providerLabel, content: delta.text };
          }
        } else if (delta.type === 'thinking_delta') {
          if (delta.thinking) {
            yield { provider: providerLabel, reasoning: delta.thinking };
          }
        }
      } else if (event.type === 'message_start') {
        promptTokens = event.message.usage?.input_tokens || 0;
        completionTokens = event.message.usage?.output_tokens || 0;
      } else if (event.type === 'message_delta') {
        if (event.usage) {
          completionTokens = event.usage.output_tokens ?? completionTokens;
        }
      }
    }

    const latency = Date.now() - startTime;
    yield {
      provider: providerLabel,
      done: true,
      latency,
      tokens: {
        total: promptTokens + completionTokens,
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
        total: promptTokens + completionTokens,
        prompt: promptTokens,
        completion: completionTokens,
      },
    };
  }
}

function dispatchStream(
  provider: ProviderConfig,
  providerLabel: 'A' | 'B',
  prompt: string,
  reasoningEffort?: ReasoningEffort
): AsyncGenerator<StreamChunk> {
  return isAnthropicProvider(provider)
    ? streamFromAnthropic(provider, providerLabel, prompt, reasoningEffort)
    : streamFromProvider(provider, providerLabel, prompt, reasoningEffort);
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
      const streamA = dispatchStream(providerA, 'A', prompt, reasoningEffortA);
      const streamB = dispatchStream(providerB, 'B', prompt, reasoningEffortB);

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
