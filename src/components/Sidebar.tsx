import type { View, CurrencyCode, Language } from '../types';
import { CURRENCIES } from '../types';

interface Props {
  view: View;
  navigate: (view: View) => void;
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  lang: Language;
  setLang: (l: Language) => void;
  businessName?: string;
}

export default function Sidebar({
  view, navigate, currency, setCurrency, lang, setLang, businessName,
}: Props) {
  const isHe = lang === 'he';

  const navItems: Array<{ view: View; icon: string; label: string }> = [
    { view: { type: 'dashboard' }, icon: '📊', label: isHe ? 'לוח בקרה' : 'Dashboard' },
    { view: { type: 'products' }, icon: '📦', label: isHe ? 'מוצרים' : 'Products' },
    { view: { type: 'forecast' }, icon: '📈', label: isHe ? 'תחזיות' : 'Forecast' },
    { view: { type: 'reports' }, icon: '📋', label: isHe ? 'דוחות' : 'Reports' },
  ];

  return (
    <aside className="sidebar" dir={isHe ? 'rtl' : 'ltr'}>
      <div className="sidebar-header">
        <h1 className="app-title" onClick={() => navigate({ type: 'dashboard' })}>
          {businessName || (isHe ? 'תכנון פיננסי' : 'BizFinance')}
        </h1>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(item => (
          <div
            key={item.view.type}
            className={`nav-item ${view.type === item.view.type ? 'active' : ''}`}
            onClick={() => navigate(item.view)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-setting">
          <label>{isHe ? 'מטבע' : 'Currency'}</label>
          <select value={currency} onChange={e => setCurrency(e.target.value as CurrencyCode)}>
            {(Object.keys(CURRENCIES) as CurrencyCode[]).map(code => (
              <option key={code} value={code}>
                {CURRENCIES[code].symbol} {code}
              </option>
            ))}
          </select>
        </div>

        <div className="sidebar-setting">
          <label>{isHe ? 'שפה' : 'Language'}</label>
          <select value={lang} onChange={e => setLang(e.target.value as Language)}>
            <option value="he">עברית</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>
    </aside>
  );
}
