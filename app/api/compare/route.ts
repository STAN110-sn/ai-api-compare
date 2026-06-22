import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { ProviderConfig, ReasoningEffort, StreamChunk } from '@/lib/types';

const ANTHROPIC_MAX_OUTPUT_TOKENS = 16_384;

// Claude 4.6 / 4.7 (and later) use adaptive thinking with output_config.effort.
// Older models (Haiku 4.5, anything 4.5 and below) only accept the legacy
// thinking.enabled shape with explicit budget_tokens.
const ADAPTIVE_THINKING_PATTERNS = [
  /^claude-opus-4-[6-9]/,
  /^claude-sonnet-4-[6-9]/,
  /^claude-haiku-4-[6-9]/,
  /^claude-(opus|sonnet|haiku)-[5-9]/,
];

function supportsAdaptiveThinking(modelId: string): boolean {
  return ADAPTIVE_THINKING_PATTERNS.some((p) => p.test(modelId));
}

const LEGACY_EFFORT_TO_BUDGET_TOKENS: Record<ReasoningEffort, number> = {
  low: 2_000,
  medium: 8_000,
  high: 16_000,
};

function isOpenAIProvider(provider: ProviderConfig): boolean {
  try {
    const host = new URL(provider.baseUrl).hostname.toLowerCase();
    return host === 'api.openai.com' || host.endsWith('.openai.com');
  } catch {
    return false;
  }
}

function isAnthropicProvider(provider: ProviderConfig): boolean {
  try {
    const host = new URL(provider.baseUrl).hostname.toLowerCase();
    return host === 'api.anthropic.com' || host.endsWith('.anthropic.com');
  } catch {
    return false;
  }
}

// chat_template_kwargs (ai&/vLLM) and reasoning_effort:"none" (xAI Grok) are
// provider extensions the OpenAI SDK doesn't type. Widen the params so we can
// send them without `any`.
type ChatCompletionCreateParamsWithThinking =
  Omit<OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming, 'reasoning_effort'> & {
    reasoning_effort?: ReasoningEffort | 'none';
    chat_template_kwargs?: { enable_thinking?: boolean };
  };

async function* streamFromProvider(
  provider: ProviderConfig,
  providerLabel: 'A' | 'B',
  prompt: string,
  reasoningEffort?: ReasoningEffort,
  disableThinking?: boolean
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

    const params: ChatCompletionCreateParamsWithThinking = {
      model: provider.model,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
      stream_options: { include_usage: true },
      ...(reasoningEffort ? { reasoning_effort: reasoningEffort } : {}),
    };

    // Turn off the model's reasoning output. The wire format depends on the
    // selected model: ai& Qwen/Gemma use chat_template_kwargs.enable_thinking,
    // xAI Grok uses reasoning_effort="none".
    if (disableThinking) {
      const offMode = provider.models.find((m) => m.id === provider.model)
        ?.thinkingOffMode ?? 'enable_thinking';
      if (offMode === 'reasoning_effort_none') {
        params.reasoning_effort = 'none';
      } else {
        params.chat_template_kwargs = { enable_thinking: false };
      }
    }

    const stream = await client.chat.completions.create(
      // reasoning_effort may be "none" (xAI extension), outside the SDK's type.
      params as OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming
    );

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

    let thinkingParams: Record<string, unknown> = {};
    let maxTokens = ANTHROPIC_MAX_OUTPUT_TOKENS;
    if (reasoningEffort) {
      if (supportsAdaptiveThinking(provider.model)) {
        // display: 'summarized' is supposed to be the default per docs but
        // observationally Opus 4.7 only emits signature_delta unless we set
        // it explicitly — be explicit so we get streamed thinking_delta.
        thinkingParams = {
          thinking: { type: 'adaptive' as const, display: 'summarized' as const },
          output_config: { effort: reasoningEffort },
        };
      } else {
        // Legacy enabled-mode requires max_tokens > budget_tokens.
        const budget = LEGACY_EFFORT_TO_BUDGET_TOKENS[reasoningEffort];
        thinkingParams = {
          thinking: { type: 'enabled' as const, budget_tokens: budget },
        };
        maxTokens = budget + 4_096;
      }
    }

    const stream = client.messages.stream({
      model: provider.model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
      ...thinkingParams,
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

async function* streamFromOpenAIResponses(
  provider: ProviderConfig,
  providerLabel: 'A' | 'B',
  prompt: string,
  reasoningEffort: ReasoningEffort
): AsyncGenerator<StreamChunk> {
  const startTime = Date.now();
  let promptTokens = 0;
  let completionTokens = 0;

  try {
    const client = new OpenAI({
      apiKey: provider.apiKey,
      baseURL: provider.baseUrl,
    });

    const stream = await client.responses.create({
      model: provider.model,
      input: prompt,
      stream: true,
      reasoning: { effort: reasoningEffort, summary: 'auto' },
    });

    for await (const event of stream) {
      if (event.type === 'response.output_text.delta') {
        if (event.delta) {
          yield { provider: providerLabel, content: event.delta };
        }
      } else if (event.type === 'response.reasoning_summary_text.delta') {
        if (event.delta) {
          yield { provider: providerLabel, reasoning: event.delta };
        }
      } else if (event.type === 'response.completed') {
        const usage = event.response.usage;
        if (usage) {
          promptTokens = usage.input_tokens || 0;
          completionTokens = usage.output_tokens || 0;
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
  reasoningEffort?: ReasoningEffort,
  disableThinking?: boolean
): AsyncGenerator<StreamChunk> {
  if (isAnthropicProvider(provider)) {
    return streamFromAnthropic(provider, providerLabel, prompt, reasoningEffort);
  }
  // OpenAI exposes reasoning content only via the Responses API; chat
  // completions strips it. So when effort is requested against api.openai.com,
  // route through Responses to surface thinking summaries.
  if (reasoningEffort && isOpenAIProvider(provider)) {
    return streamFromOpenAIResponses(provider, providerLabel, prompt, reasoningEffort);
  }
  return streamFromProvider(provider, providerLabel, prompt, reasoningEffort, disableThinking);
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
  const {
    prompt,
    providerA,
    providerB,
    reasoningEffortA,
    reasoningEffortB,
    disableThinkingA,
    disableThinkingB,
  } = await request.json();

  if (!prompt || !providerA || !providerB) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const streamA = dispatchStream(providerA, 'A', prompt, reasoningEffortA, disableThinkingA);
      const streamB = dispatchStream(providerB, 'B', prompt, reasoningEffortB, disableThinkingB);

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
