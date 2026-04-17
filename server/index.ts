import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('[server] ANTHROPIC_API_KEY is not set — /api/chat will fail until you add it to .env');
}

const client = new Anthropic();

interface NotebookContext {
  label: string;
  source_type: string;
  description?: string;
  cached_summary: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  notebooks: NotebookContext[];
  language?: 'he' | 'en';
}

function buildSystemPrompt(notebooks: NotebookContext[], language: 'he' | 'en'): Anthropic.TextBlockParam[] {
  const persona = language === 'he'
    ? 'אתה עוזר פיננסי חכם של VistaFlow לעסקים קטנים. ענה בעברית באופן תמציתי וענייני. בסס את תשובותיך על הידע מה-NotebookLM כשזה רלוונטי, וציין במפורש מאיזה מקור ידע אתה שואב.'
    : "You are VistaFlow's financial planning assistant for small businesses. Be concise and actionable. Ground answers in the NotebookLM knowledge when relevant, and cite which source you drew from.";

  const blocks: Anthropic.TextBlockParam[] = [{ type: 'text', text: persona }];

  if (notebooks.length > 0) {
    const knowledgeSections = notebooks.map(n => {
      const desc = n.description ? `\n(${n.description})` : '';
      return `### ${n.label} — ${n.source_type}${desc}\n${n.cached_summary}`;
    });

    blocks.push({
      type: 'text',
      text: `## Knowledge from the user's connected NotebookLM notebooks\n\n${knowledgeSections.join('\n\n---\n\n')}`,
      cache_control: { type: 'ephemeral' },
    });
  }

  return blocks;
}

app.post('/api/chat', async (req, res) => {
  const body = req.body as ChatRequest;

  if (!body?.messages?.length) {
    return res.status(400).json({ error: 'messages is required' });
  }

  const system = buildSystemPrompt(body.notebooks ?? [], body.language ?? 'he');
  const messages: Anthropic.MessageParam[] = body.messages.map(m => ({
    role: m.role,
    content: m.content,
  }));

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const stream = client.messages.stream({
      model: 'claude-opus-4-7',
      max_tokens: 64000,
      thinking: { type: 'adaptive' },
      system,
      messages,
    });

    stream.on('text', delta => send('delta', { text: delta }));

    const finalMessage = await stream.finalMessage();
    send('done', {
      stop_reason: finalMessage.stop_reason,
      usage: {
        input_tokens: finalMessage.usage.input_tokens,
        output_tokens: finalMessage.usage.output_tokens,
        cache_read_input_tokens: finalMessage.usage.cache_read_input_tokens,
        cache_creation_input_tokens: finalMessage.usage.cache_creation_input_tokens,
      },
    });
    res.end();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[server] chat error:', message);
    send('error', { message });
    res.end();
  }
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    has_api_key: Boolean(process.env.ANTHROPIC_API_KEY),
  });
});

app.listen(port, () => {
  console.log(`[server] VistaFlow Claude bridge running on http://localhost:${port}`);
});
