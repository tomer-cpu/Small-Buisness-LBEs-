import { base44 } from './base44-client';

/**
 * NotebookLM <-> BASE44 / local storage integration.
 *
 * When BASE44 is configured (VITE_BASE44_APP_ID is set and entity exists)
 * notebook sources persist there. Otherwise they fall back to localStorage
 * so the user can try the integration without a backend.
 */

const STORAGE_KEY = 'vistaflow.notebook_sources';

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

const NOTEBOOKLM_URL_REGEX = /notebooklm\.google\.com\/notebook\/([a-zA-Z0-9_-]+)/;

export function parseNotebookUrl(url: string): string | null {
  const match = url.match(NOTEBOOKLM_URL_REGEX);
  if (match) return match[1];
  if (/^[a-zA-Z0-9_-]+$/.test(url.trim())) return url.trim();
  return null;
}

export function buildNotebookUrl(notebookId: string): string {
  return `https://notebooklm.google.com/notebook/${notebookId}`;
}

function readLocal(): NotebookSourceType[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as NotebookSourceType[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(sources: NotebookSourceType[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sources));
}

function generateId(): string {
  return `nb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function base44Entity() {
  try {
    return (base44.entities as Record<string, unknown>).NotebookSource as
      | {
          list: () => Promise<unknown[]>;
          create: (data: Partial<NotebookSourceType>) => Promise<NotebookSourceType>;
          update: (id: string, data: Partial<NotebookSourceType>) => Promise<NotebookSourceType>;
          delete: (id: string) => Promise<void>;
        }
      | undefined;
  } catch {
    return undefined;
  }
}

export async function listNotebookSources(): Promise<NotebookSourceType[]> {
  const entity = base44Entity();
  if (entity) {
    try {
      const result = await entity.list();
      return result as NotebookSourceType[];
    } catch {
      // Fall through to local storage
    }
  }
  return readLocal();
}

export async function connectNotebook(params: {
  notebook_id: string;
  label: string;
  description?: string;
  source_type: NotebookSourceType['source_type'];
}): Promise<NotebookSourceType> {
  const payload = {
    ...params,
    sync_enabled: true,
    last_synced_at: new Date().toISOString(),
  };

  const entity = base44Entity();
  if (entity) {
    try {
      return await entity.create(payload);
    } catch {
      // Fall through to local storage
    }
  }

  const record: NotebookSourceType = { id: generateId(), ...payload };
  const current = readLocal();
  writeLocal([...current, record]);
  return record;
}

export async function disconnectNotebook(id: string): Promise<void> {
  const entity = base44Entity();
  if (entity) {
    try {
      await entity.delete(id);
      return;
    } catch {
      // Fall through to local storage
    }
  }
  writeLocal(readLocal().filter(s => s.id !== id));
}

export async function toggleSync(id: string, enabled: boolean): Promise<NotebookSourceType> {
  const entity = base44Entity();
  if (entity) {
    try {
      return await entity.update(id, { sync_enabled: enabled });
    } catch {
      // Fall through to local storage
    }
  }
  const current = readLocal();
  const updated = current.map(s => (s.id === id ? { ...s, sync_enabled: enabled } : s));
  writeLocal(updated);
  return updated.find(s => s.id === id)!;
}

export async function updateCachedSummary(id: string, summary: string): Promise<NotebookSourceType> {
  const patch = {
    cached_summary: summary,
    last_synced_at: new Date().toISOString(),
  };

  const entity = base44Entity();
  if (entity) {
    try {
      return await entity.update(id, patch);
    } catch {
      // Fall through to local storage
    }
  }

  const current = readLocal();
  const updated = current.map(s => (s.id === id ? { ...s, ...patch } : s));
  writeLocal(updated);
  return updated.find(s => s.id === id)!;
}

export const SOURCE_TYPE_LABELS: Record<NotebookSourceType['source_type'], { he: string; en: string }> = {
  business_docs: { he: 'מסמכים עסקיים', en: 'Business Documents' },
  financial_guides: { he: 'מדריכים פיננסיים', en: 'Financial Guides' },
  product_research: { he: 'מחקר מוצרים', en: 'Product Research' },
  market_analysis: { he: 'ניתוח שוק', en: 'Market Analysis' },
  custom: { he: 'מותאם אישית', en: 'Custom' },
};
