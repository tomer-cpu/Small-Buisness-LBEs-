import { useState, useEffect } from 'react';
import type { Language } from '../types';
import {
  listNotebookSources,
  connectNotebook,
  disconnectNotebook,
  toggleSync,
  updateCachedSummary,
  parseNotebookUrl,
  buildNotebookUrl,
  SOURCE_TYPE_LABELS,
} from '../sdk-client/notebooklm-integration';
import type { NotebookSourceType } from '../sdk-client/notebooklm-integration';

interface Props {
  lang: Language;
}

const EMPTY_FORM = {
  notebook_id: '',
  label: '',
  description: '',
  source_type: 'business_docs' as NotebookSourceType['source_type'],
};

export default function NotebookLM({ lang }: Props) {
  const isHe = lang === 'he';
  const [sources, setSources] = useState<NotebookSourceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [summaryEditId, setSummaryEditId] = useState<string | null>(null);
  const [summaryDraft, setSummaryDraft] = useState('');

  useEffect(() => {
    loadSources();
  }, []);

  async function loadSources() {
    setLoading(true);
    try {
      const data = await listNotebookSources();
      setSources(data);
    } catch {
      setError(isHe ? 'שגיאה בטעינת מקורות' : 'Error loading sources');
    }
    setLoading(false);
  }

  async function handleConnect() {
    setError('');
    const notebookId = parseNotebookUrl(form.notebook_id);
    if (!notebookId) {
      setError(isHe ? 'כתובת או מזהה מחברת לא תקין' : 'Invalid notebook URL or ID');
      return;
    }
    if (!form.label.trim()) {
      setError(isHe ? 'נא להזין שם תצוגה' : 'Please enter a display name');
      return;
    }
    try {
      await connectNotebook({
        notebook_id: notebookId,
        label: form.label.trim(),
        description: form.description.trim() || undefined,
        source_type: form.source_type,
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      await loadSources();
    } catch {
      setError(isHe ? 'שגיאה בחיבור המחברת' : 'Error connecting notebook');
    }
  }

  async function handleDisconnect(id: string) {
    if (!confirm(isHe ? 'האם לנתק מחברת זו?' : 'Disconnect this notebook?')) return;
    try {
      await disconnectNotebook(id);
      await loadSources();
    } catch {
      setError(isHe ? 'שגיאה בניתוק' : 'Error disconnecting');
    }
  }

  async function handleToggleSync(id: string, enabled: boolean) {
    try {
      await toggleSync(id, enabled);
      await loadSources();
    } catch {
      setError(isHe ? 'שגיאה בעדכון' : 'Error updating');
    }
  }

  async function handleSaveSummary(id: string) {
    try {
      await updateCachedSummary(id, summaryDraft);
      setSummaryEditId(null);
      setSummaryDraft('');
      await loadSources();
    } catch {
      setError(isHe ? 'שגיאה בשמירת סיכום' : 'Error saving summary');
    }
  }

  function formatDate(iso?: string) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString(isHe ? 'he-IL' : 'en-US', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>{isHe ? 'חיבור NotebookLM' : 'NotebookLM Connection'}</h2>
          <p className="page-subtitle">
            {isHe
              ? 'חבר מחברות NotebookLM כמקור ידע לעוזר ה-AI של VistaFlow'
              : 'Connect NotebookLM notebooks as knowledge sources for the VistaFlow AI assistant'}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm
            ? (isHe ? 'ביטול' : 'Cancel')
            : (isHe ? '+ חבר מחברת' : '+ Connect Notebook')}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Connection Form */}
      {showForm && (
        <div className="card notebook-form">
          <h3>{isHe ? 'חיבור מחברת חדשה' : 'Connect New Notebook'}</h3>

          <div className="form-grid">
            <div className="form-group">
              <label>{isHe ? 'כתובת / מזהה NotebookLM' : 'NotebookLM URL or ID'}</label>
              <input
                type="text"
                placeholder={isHe ? 'הדביקו קישור שיתוף או מזהה מחברת' : 'Paste share link or notebook ID'}
                value={form.notebook_id}
                onChange={e => setForm({ ...form, notebook_id: e.target.value })}
                dir="ltr"
              />
            </div>

            <div className="form-group">
              <label>{isHe ? 'שם תצוגה' : 'Display Name'}</label>
              <input
                type="text"
                placeholder={isHe ? 'לדוגמה: מחקר שוק נרות 2026' : 'e.g., Candle Market Research 2026'}
                value={form.label}
                onChange={e => setForm({ ...form, label: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>{isHe ? 'תיאור' : 'Description'}</label>
              <input
                type="text"
                placeholder={isHe ? 'מה המחברת מכילה?' : 'What does this notebook contain?'}
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>{isHe ? 'סוג מקור' : 'Source Type'}</label>
              <select
                value={form.source_type}
                onChange={e => setForm({ ...form, source_type: e.target.value as NotebookSourceType['source_type'] })}
              >
                {(Object.keys(SOURCE_TYPE_LABELS) as NotebookSourceType['source_type'][]).map(key => (
                  <option key={key} value={key}>
                    {isHe ? SOURCE_TYPE_LABELS[key].he : SOURCE_TYPE_LABELS[key].en}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-actions">
            <button className="btn btn-primary" onClick={handleConnect}>
              {isHe ? 'חבר מחברת' : 'Connect Notebook'}
            </button>
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="card notebook-how-it-works">
        <h3>{isHe ? 'איך זה עובד?' : 'How does it work?'}</h3>
        <div className="steps-grid">
          <div className="step">
            <span className="step-number">1</span>
            <strong>{isHe ? 'יצירת מחברת' : 'Create Notebook'}</strong>
            <p>{isHe
              ? 'צרו מחברת ב-NotebookLM עם מסמכים עסקיים, מחקרי שוק או מדריכים פיננסיים'
              : 'Create a notebook in NotebookLM with business docs, market research, or financial guides'}</p>
          </div>
          <div className="step">
            <span className="step-number">2</span>
            <strong>{isHe ? 'חיבור' : 'Connect'}</strong>
            <p>{isHe
              ? 'הדביקו את קישור השיתוף של NotebookLM כאן וחברו את המחברת'
              : 'Paste the NotebookLM share link here and connect the notebook'}</p>
          </div>
          <div className="step">
            <span className="step-number">3</span>
            <strong>{isHe ? 'סנכרון ידע' : 'Sync Knowledge'}</strong>
            <p>{isHe
              ? 'הוסיפו סיכום מ-NotebookLM כדי שהעוזר יוכל להשתמש בידע'
              : 'Add a summary from NotebookLM so the assistant can use the knowledge'}</p>
          </div>
          <div className="step">
            <span className="step-number">4</span>
            <strong>{isHe ? 'שאלו את העוזר' : 'Ask the Assistant'}</strong>
            <p>{isHe
              ? 'העוזר ישתמש בידע מהמחברות כשעונה על שאלות פיננסיות'
              : 'The assistant will use notebook knowledge when answering financial questions'}</p>
          </div>
        </div>
      </div>

      {/* Connected Sources */}
      <div className="card">
        <h3>
          {isHe ? 'מחברות מחוברות' : 'Connected Notebooks'}
          <span className="badge badge-count">{sources.length}</span>
        </h3>

        {loading ? (
          <p className="loading-text">{isHe ? 'טוען...' : 'Loading...'}</p>
        ) : sources.length === 0 ? (
          <p className="empty-state">
            {isHe
              ? 'אין מחברות מחוברות עדיין. לחצו "+ חבר מחברת" כדי להתחיל.'
              : 'No notebooks connected yet. Click "+ Connect Notebook" to get started.'}
          </p>
        ) : (
          <div className="notebook-sources-list">
            {sources.map(source => (
              <div key={source.id} className={`notebook-source-card ${!source.sync_enabled ? 'disabled' : ''}`}>
                <div className="source-header">
                  <div className="source-info">
                    <h4>{source.label}</h4>
                    <span className={`badge badge-source-type badge-${source.source_type}`}>
                      {isHe ? SOURCE_TYPE_LABELS[source.source_type].he : SOURCE_TYPE_LABELS[source.source_type].en}
                    </span>
                    {source.sync_enabled ? (
                      <span className="badge badge-active">{isHe ? 'פעיל' : 'Active'}</span>
                    ) : (
                      <span className="badge badge-inactive">{isHe ? 'מושהה' : 'Paused'}</span>
                    )}
                  </div>
                  <div className="source-actions">
                    <a
                      href={buildNotebookUrl(source.notebook_id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm btn-outline"
                      title={isHe ? 'פתח ב-NotebookLM' : 'Open in NotebookLM'}
                    >
                      {isHe ? 'פתח' : 'Open'}
                    </a>
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => handleToggleSync(source.id, !source.sync_enabled)}
                    >
                      {source.sync_enabled
                        ? (isHe ? 'השהה' : 'Pause')
                        : (isHe ? 'הפעל' : 'Resume')}
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDisconnect(source.id)}
                    >
                      {isHe ? 'נתק' : 'Disconnect'}
                    </button>
                  </div>
                </div>

                {source.description && (
                  <p className="source-description">{source.description}</p>
                )}

                <div className="source-meta">
                  <span>{isHe ? 'סנכרון אחרון:' : 'Last synced:'} {formatDate(source.last_synced_at)}</span>
                  <span dir="ltr">ID: {source.notebook_id}</span>
                </div>

                {/* Summary section */}
                <div className="source-summary-section">
                  {summaryEditId === source.id ? (
                    <div className="summary-editor">
                      <textarea
                        value={summaryDraft}
                        onChange={e => setSummaryDraft(e.target.value)}
                        placeholder={isHe
                          ? 'הדביקו כאן סיכום מ-NotebookLM. העוזר ישתמש בזה כידע.'
                          : 'Paste a summary from NotebookLM here. The assistant will use this as knowledge.'}
                        rows={6}
                      />
                      <div className="summary-actions">
                        <button className="btn btn-primary btn-sm" onClick={() => handleSaveSummary(source.id)}>
                          {isHe ? 'שמור' : 'Save'}
                        </button>
                        <button className="btn btn-sm btn-outline" onClick={() => setSummaryEditId(null)}>
                          {isHe ? 'ביטול' : 'Cancel'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {source.cached_summary ? (
                        <div className="summary-preview">
                          <strong>{isHe ? 'סיכום ידע:' : 'Knowledge summary:'}</strong>
                          <p>{source.cached_summary.substring(0, 200)}{source.cached_summary.length > 200 ? '...' : ''}</p>
                        </div>
                      ) : (
                        <p className="summary-missing">
                          {isHe
                            ? 'אין סיכום עדיין — הוסיפו סיכום כדי שהעוזר יוכל להשתמש בידע מהמחברת'
                            : 'No summary yet — add a summary so the assistant can use notebook knowledge'}
                        </p>
                      )}
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => {
                          setSummaryEditId(source.id);
                          setSummaryDraft(source.cached_summary || '');
                        }}
                      >
                        {source.cached_summary
                          ? (isHe ? 'עדכן סיכום' : 'Update Summary')
                          : (isHe ? 'הוסף סיכום' : 'Add Summary')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
