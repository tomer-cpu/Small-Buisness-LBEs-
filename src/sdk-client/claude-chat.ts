import type { NotebookSourceType } from './notebooklm-integration';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatUsage {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens: number;
  cache_creation_input_tokens: number;
}

interface ChatCallbacks {
  onDelta: (text: string) => void;
  onDone: (usage: ChatUsage, stopReason: string | null) => void;
  onError: (message: string) => void;
}

export async function streamChat(
  messages: ChatMessage[],
  notebooks: NotebookSourceType[],
  language: 'he' | 'en',
  callbacks: ChatCallbacks,
): Promise<void> {
  const activeNotebooks = notebooks
    .filter(n => n.sync_enabled && n.cached_summary)
    .map(n => ({
      label: n.label,
      source_type: n.source_type,
      description: n.description,
      cached_summary: n.cached_summary!,
    }));

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, notebooks: activeNotebooks, language }),
  });

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => '');
    callbacks.onError(text || `HTTP ${response.status}`);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let eventBoundary = buffer.indexOf('\n\n');
    while (eventBoundary !== -1) {
      const rawEvent = buffer.slice(0, eventBoundary);
      buffer = buffer.slice(eventBoundary + 2);

      const lines = rawEvent.split('\n');
      let eventType = 'message';
      let dataRaw = '';
      for (const line of lines) {
        if (line.startsWith('event: ')) eventType = line.slice(7).trim();
        else if (line.startsWith('data: ')) dataRaw += line.slice(6);
      }

      if (dataRaw) {
        try {
          const data = JSON.parse(dataRaw);
          if (eventType === 'delta') callbacks.onDelta(data.text);
          else if (eventType === 'done') callbacks.onDone(data.usage, data.stop_reason);
          else if (eventType === 'error') callbacks.onError(data.message);
        } catch {
          // Skip malformed events
        }
      }

      eventBoundary = buffer.indexOf('\n\n');
    }
  }
}

export async function checkServerHealth(): Promise<{ ok: boolean; has_api_key: boolean } | null> {
  try {
    const response = await fetch('/api/health');
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}
