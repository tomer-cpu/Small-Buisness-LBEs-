import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import ForecastPage from './pages/ForecastPage';
import Reports from './pages/Reports';
import NotebookLMPage from './pages/NotebookLM';
import Chat from './pages/Chat';
import type { View, CurrencyCode, Language } from './types';
import './App.css';

function getViewFromUrl(): View {
  const path = window.location.pathname;
  if (path === '/products') return { type: 'products' };
  if (path === '/forecast') return { type: 'forecast' };
  if (path === '/reports') return { type: 'reports' };
  if (path === '/notebooklm') return { type: 'notebooklm' };
  if (path === '/chat') return { type: 'chat' };
  return { type: 'dashboard' };
}

function getUrlFromView(view: View): string {
  if (view.type === 'products') return '/products';
  if (view.type === 'forecast') return '/forecast';
  if (view.type === 'reports') return '/reports';
  if (view.type === 'notebooklm') return '/notebooklm';
  if (view.type === 'chat') return '/chat';
  return '/';
}

function App() {
  const [view, setView] = useState<View>(getViewFromUrl());
  const [currency, setCurrency] = useState<CurrencyCode>('ILS');
  const [lang, setLang] = useState<Language>('he');

  const navigate = (newView: View) => {
    window.history.pushState(null, '', getUrlFromView(newView));
    setView(newView);
  };

  return (
    <div className={`app ${lang === 'he' ? 'rtl' : 'ltr'}`} dir={lang === 'he' ? 'rtl' : 'ltr'}>
      <Sidebar
        view={view}
        navigate={navigate}
        currency={currency}
        setCurrency={setCurrency}
        lang={lang}
        setLang={setLang}
      />
      <main className="main-content">
        {view.type === 'dashboard' && <Dashboard currency={currency} lang={lang} />}
        {view.type === 'products' && <Products currency={currency} lang={lang} />}
        {view.type === 'forecast' && <ForecastPage currency={currency} lang={lang} />}
        {view.type === 'reports' && <Reports currency={currency} lang={lang} />}
        {view.type === 'notebooklm' && <NotebookLMPage lang={lang} />}
        {view.type === 'chat' && <Chat lang={lang} />}
      </main>
    </div>
  );
}

export default App;
