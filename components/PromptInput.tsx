'use client';

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
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Prompt
      </label>
      <div className="flex gap-2">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter your prompt here..."
          rows={3}
          className="flex-1 resize-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          disabled={isLoading}
        />
        {isLoading ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Stop processing"
            title="Stop processing"
            className="flex items-center justify-center gap-2 rounded-lg bg-red-600 px-6 text-white transition-colors hover:bg-red-700"
          >
            <Square className="h-4 w-4 fill-current" />
            <span className="text-sm font-medium">Stop</span>
          </button>
        ) : (
          <button
            type="submit"
            disabled={disabled || !value.trim()}
            aria-label="Send prompt"
            className="flex items-center justify-center rounded-lg bg-blue-600 px-6 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
          </button>
        )}
      </div>
    </form>
  );
}
