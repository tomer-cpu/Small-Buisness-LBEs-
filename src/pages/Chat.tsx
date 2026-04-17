import { useState, useEffect, useRef } from 'react';
import type { Language } from '../types';
import { listNotebookSources } from '../sdk-client/notebooklm-integration';
import type { NotebookSourceType } from '../sdk-client/notebooklm-integration';
import { streamChat, checkServerHealth } from '../sdk-client/claude-chat';
import type { ChatMessage, ChatUsage } from '../sdk-client/claude-chat';

interface Props {
  lang: Language;
}

interface Turn extends ChatMessage {
  id: string;
  streaming?: boolean;
}

export default function Chat({ lang }: Props) {
  const isHe = lang === 'he';
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [notebooks, setNotebooks] = useState<NotebookSourceType[]>([]);
  const [sending, setSending] = useState(false);
  const [health, setHealth] = useState<{ ok: boolean; has_api_key: boolean } | null>(null);
  const [lastUsage, setLastUsage] = useState<ChatUsage | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listNotebookSources().then(setNotebooks).catch(() => setNotebooks([]));
    checkServerHealth().then(setHealth);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns]);

  const activeNotebooks = notebooks.filter(n => n.sync_enabled && n.cached_summary);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;

    const userTurn: Turn = { id: `u_${Date.now()}`, role: 'user', content: text };
    const assistantTurn: Turn = { id: `a_${Date.now()}`, role: 'assistant', content: '', streaming: true };

    const history: ChatMessage[] = [...turns, userTurn].map(t => ({ role: t.role, content: t.content }));

    setTurns(prev => [...prev, userTurn, assistantTurn]);
    setInput('');
    setSending(true);

    try {
      await streamChat(history, notebooks, lang, {
        onDelta: delta => {
          setTurns(prev =>
            prev.map(t => (t.id === assistantTurn.id ? { ...t, content: t.content + delta } : t)),
          );
        },
        onDone: (usage) => {
          setLastUsage(usage);
          setTurns(prev =>
            prev.map(t => (t.id === assistantTurn.id ? { ...t, streaming: false } : t)),
          );
        },
        onError: (message) => {
          setTurns(prev =>
            prev.map(t =>
              t.id === assistantTurn.id
                ? { ...t, content: `⚠️ ${message}`, streaming: false }
                : t,
            ),
          );
        },
      });
    } finally {
      setSending(false);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function clearChat() {
    setTurns([]);
    setLastUsage(null);
  }

  return (
    <div className="page-container chat-page">
      <div className="page-header">
        <div>
          <h2>{isHe ? 'צ\'אט עם Claude' : 'Chat with Claude'}</h2>
          <p className="page-subtitle">
            {isHe
              ? 'שוחחו עם Claude באמצעות הידע מהמחברות שחיברתם'
              : 'Chat with Claude powered by your connected NotebookLM notebooks'}
          </p>
        </div>
        {turns.length > 0 && (
          <button className="btn btn-outline" onClick={clearChat}>
            {isHe ? 'נקה שיחה' : 'Clear Chat'}
          </button>
        )}
      </div>

      {/* Status bar */}
      <div className="chat-status-bar">
        <div className="status-item">
          <span className={`status-dot ${health?.has_api_key ? 'ok' : 'error'}`} />
          <span>
            {health === null
              ? (isHe ? 'בודק שרת...' : 'Checking server...')
              : !health.ok
                ? (isHe ? 'השרת לא פועל — הפעילו npm run dev' : 'Server offline — run npm run dev')
                : !health.has_api_key
                  ? (isHe ? 'חסר ANTHROPIC_API_KEY ב-.env' : 'Missing ANTHROPIC_API_KEY in .env')
                  : (isHe ? 'מחובר ל-Claude' : 'Connected to Claude')}
          </span>
        </div>
        <div className="status-item">
          <span className="status-dot ok" />
          <span>
            {activeNotebooks.length > 0
              ? isHe
                ? `${activeNotebooks.length} מחברות פעילות`
                : `${activeNotebooks.length} active notebooks`
              : isHe
                ? 'אין מחברות פעילות — חברו מחברת ב-NotebookLM'
                : 'No active notebooks — connect one in the NotebookLM tab'}
          </span>
        </div>
        {lastUsage && (
          <div className="status-item usage">
            <span>
              {isHe ? 'טוקנים:' : 'Tokens:'}{' '}
              <strong>{lastUsage.input_tokens + lastUsage.output_tokens}</strong>
              {lastUsage.cache_read_input_tokens > 0 && (
                <span className="cache-hit">
                  {' · '}
                  {isHe ? 'מטמון:' : 'cache:'} {lastUsage.cache_read_input_tokens}
                </span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="chat-messages" ref={scrollRef}>
        {turns.length === 0 ? (
          <div className="chat-empty">
            <h3>{isHe ? 'התחילו שיחה' : 'Start a conversation'}</h3>
            <p>
              {isHe
                ? 'שאלו את Claude שאלות על העסק, תחזיות, או כל דבר שקשור לידע מהמחברות שלכם.'
                : 'Ask Claude about your business, forecasts, or anything related to your notebook knowledge.'}
            </p>
            <div className="chat-suggestions">
              {[
                isHe ? 'מה מגמות הרווחיות של המוצרים שלי?' : 'What are the profitability trends in my products?',
                isHe ? 'איך לשפר את התחזיות שלי לחודש הבא?' : 'How can I improve my forecasts for next month?',
                isHe ? 'סכם לי את הנקודות העיקריות מהמחברות שלי' : 'Summarize the key points from my notebooks',
              ].map((suggestion, i) => (
                <button
                  key={i}
                  className="chat-suggestion"
                  onClick={() => setInput(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          turns.map(turn => (
            <div key={turn.id} className={`chat-turn chat-turn-${turn.role}`}>
              <div className="chat-turn-avatar">
                {turn.role === 'user' ? '👤' : '🤖'}
              </div>
              <div className="chat-turn-content">
                {turn.content || (turn.streaming && <span className="chat-thinking">···</span>)}
                {turn.streaming && turn.content && <span className="chat-cursor">▋</span>}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="chat-input-area">
        <textarea
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={isHe ? 'כתבו הודעה... (Enter לשלוח, Shift+Enter לשורה חדשה)' : 'Type a message... (Enter to send, Shift+Enter for new line)'}
          rows={3}
          disabled={sending || health?.has_api_key === false}
        />
        <button
          className="btn btn-primary chat-send-btn"
          onClick={handleSend}
          disabled={!input.trim() || sending || health?.has_api_key === false}
        >
          {sending ? (isHe ? 'שולח...' : 'Sending...') : (isHe ? 'שלח' : 'Send')}
        </button>
      </div>
    </div>
  );
}
