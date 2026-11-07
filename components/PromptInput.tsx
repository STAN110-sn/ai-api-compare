'use client';

import { useId } from 'react';
import { Send, Square } from 'lucide-react';

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  isLoading: boolean;
  disabled: boolean;
}

export function PromptInput({
  value,
  onChange,
  onSubmit,
  onStop,
  isLoading,
  disabled,
}: PromptInputProps) {
  const promptId = useId();
  const promptHintId = `${promptId}-hint`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) {
      onStop();
      return;
    }
    if (!disabled && value.trim()) {
      onSubmit();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (!disabled && !isLoading && value.trim()) {
        onSubmit();
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex min-w-0 flex-col gap-2">
      <label
        htmlFor={promptId}
        className="text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        Prompt
      </label>
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
        <textarea
          id={promptId}
          name="prompt"
          autoComplete="off"
          aria-describedby={promptHintId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter your prompt here…"
          rows={3}
          className="w-full min-w-0 flex-1 resize-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          disabled={isLoading}
        />
        {isLoading ? (
          <button
            type="button"
            onClick={onStop}
            title="Stop processing"
            className="flex w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-white transition-colors hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 sm:w-auto"
          >
            <Square aria-hidden="true" className="h-4 w-4 fill-current" />
            <span className="text-sm font-medium">Stop</span>
          </button>
        ) : (
          <button
            type="submit"
            disabled={disabled || !value.trim()}
            className="flex w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:opacity-50 sm:w-auto"
          >
            <Send aria-hidden="true" className="h-5 w-5" />
            <span className="text-sm font-medium">Compare</span>
          </button>
        )}
      </div>
      <p id={promptHintId} className="text-xs text-gray-500 dark:text-gray-400">
        Cmd/Ctrl + Enter to compare
      </p>
    </form>
  );
}
