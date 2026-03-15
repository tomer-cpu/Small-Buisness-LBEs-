import { base44 } from './base44-client';

/**
 * NotebookLM ↔ BASE44 Integration Service
 *
 * Bridges Google NotebookLM notebooks with the BASE44 agent,
 * allowing the VistaFlow assistant to use notebook knowledge
 * when answering financial planning questions.
 */

export const NotebookSource = base44.entities.NotebookSource;

export interface NotebookSourceType {
  id: string;
  notebook_id: string;
  label: string;
  description?: string;
  source_type: 'business_docs' | 'financial_guides' | 'product_research' | 'market_analysis' | 'custom';
  sync_enabled: boolean;
  last_synced_at?: string;
  cached_summary?: string;
}

// NotebookLM share URL pattern
const NOTEBOOKLM_URL_REGEX = /notebooklm\.google\.com\/notebook\/([a-zA-Z0-9_-]+)/;

/**
 * Extract notebook ID from a NotebookLM share URL
 */
export function parseNotebookUrl(url: string): string | null {
  const match = url.match(NOTEBOOKLM_URL_REGEX);
  if (match) return match[1];
  // If it's already a plain ID, return as-is
  if (/^[a-zA-Z0-9_-]+$/.test(url.trim())) return url.trim();
  return null;
}

/**
 * Build the NotebookLM share URL from an ID
 */
export function buildNotebookUrl(notebookId: string): string {
  return `https://notebooklm.google.com/notebook/${notebookId}`;
}

/**
 * Load all connected notebook sources
 */
export async function listNotebookSources(): Promise<NotebookSourceType[]> {
  const result = await NotebookSource.list();
  return result as NotebookSourceType[];
}

/**
 * Connect a new NotebookLM notebook as a knowledge source
 */
export async function connectNotebook(params: {
  notebook_id: string;
  label: string;
  description?: string;
  source_type: NotebookSourceType['source_type'];
}): Promise<NotebookSourceType> {
  const record = await NotebookSource.create({
    ...params,
    sync_enabled: true,
    last_synced_at: new Date().toISOString(),
  });
  return record as NotebookSourceType;
}

/**
 * Disconnect (remove) a notebook source
 */
export async function disconnectNotebook(id: string): Promise<void> {
  await NotebookSource.delete(id);
}

/**
 * Toggle sync status for a notebook source
 */
export async function toggleSync(id: string, enabled: boolean): Promise<NotebookSourceType> {
  const record = await NotebookSource.update(id, { sync_enabled: enabled });
  return record as NotebookSourceType;
}

/**
 * Update the cached summary (from NotebookLM content)
 */
export async function updateCachedSummary(id: string, summary: string): Promise<NotebookSourceType> {
  const record = await NotebookSource.update(id, {
    cached_summary: summary,
    last_synced_at: new Date().toISOString(),
  });
  return record as NotebookSourceType;
}

/**
 * Build agent context from all active notebook sources.
 * This is injected into the BASE44 agent's system prompt
 * so it can reference NotebookLM knowledge when answering questions.
 */
export async function buildAgentKnowledgeContext(): Promise<string> {
  const sources = await listNotebookSources();
  const activeSources = sources.filter(s => s.sync_enabled && s.cached_summary);

  if (activeSources.length === 0) return '';

  const sections = activeSources.map(s =>
    `### ${s.label} (${s.source_type})\n${s.cached_summary}`
  );

  return [
    '## Knowledge from NotebookLM Sources',
    '',
    ...sections,
  ].join('\n');
}

/**
 * Source type labels for the UI
 */
export const SOURCE_TYPE_LABELS: Record<NotebookSourceType['source_type'], { he: string; en: string }> = {
  business_docs: { he: 'מסמכים עסקיים', en: 'Business Documents' },
  financial_guides: { he: 'מדריכים פיננסיים', en: 'Financial Guides' },
  product_research: { he: 'מחקר מוצרים', en: 'Product Research' },
  market_analysis: { he: 'ניתוח שוק', en: 'Market Analysis' },
  custom: { he: 'מותאם אישית', en: 'Custom' },
};
