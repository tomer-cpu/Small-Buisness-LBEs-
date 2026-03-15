import { useEffect, useState } from 'react';
import { Product, Forecast } from '../sdk-client/base44-client';
import { generateReport, formatAmount, generateMonthRange, getMonthLabel } from '../utils/financial';
import type { ProductType, ForecastType, CurrencyCode, FullReport } from '../types';

interface Props {
  currency: CurrencyCode;
  lang: string;
}

export default function Reports({ currency, lang }: Props) {
  const [products, setProducts] = useState<ProductType[]>([]);
  const [forecasts, setForecasts] = useState<ForecastType[]>([]);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<FullReport | null>(null);

  const now = new Date();
  const [startYear, setStartYear] = useState(now.getFullYear());
  const [startMonth, setStartMonth] = useState(now.getMonth() + 1);
  const [numMonths, setNumMonths] = useState(6);

  const isHe = lang === 'he';

  useEffect(() => {
    Promise.all([Product.list(), Forecast.list()])
      .then(([prods, fcs]) => {
        setProducts(prods);
        setForecasts(fcs);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleGenerate = () => {
    const r = generateReport(products, forecasts, startYear, startMonth, numMonths, lang);
    setReport(r);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div className="loading">{isHe ? 'טוען...' : 'Loading...'}</div>;

  return (
    <div className="reports-page">
      <h1>{isHe ? 'דוח תחזית פיננסית' : 'Financial Forecast Report'}</h1>

      <div className="report-controls">
        <div className="form-row">
          <div className="form-group">
            <label>{isHe ? 'שנת התחלה' : 'Start Year'}</label>
            <input type="number" value={startYear}
              onChange={e => setStartYear(parseInt(e.target.value) || now.getFullYear())} />
          </div>
          <div className="form-group">
            <label>{isHe ? 'חודש התחלה' : 'Start Month'}</label>
            <select value={startMonth} onChange={e => setStartMonth(parseInt(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{getMonthLabel(startYear, m, lang)}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>{isHe ? 'מספר חודשים (עד 12)' : 'Months (up to 12)'}</label>
            <select value={numMonths} onChange={e => setNumMonths(parseInt(e.target.value))}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="report-actions-bar">
          <button className="btn btn-primary" onClick={handleGenerate}>
            {isHe ? 'הפקת דוח' : 'Generate Report'}
          </button>
          {report && (
            <button className="btn" onClick={handlePrint}>
              {isHe ? 'הדפסה' : 'Print'}
            </button>
          )}
        </div>
      </div>

      {report && (
        <div className="report-content" id="printable-report">
          {/* Grand Totals */}
          <div className="report-grand-totals">
            <div className="grand-stat">
              <span className="grand-label">{isHe ? 'סה״כ הכנסות' : 'Total Revenue'}</span>
              <span className="grand-value">{formatAmount(report.grandTotalRevenue, currency)}</span>
            </div>
            <div className="grand-stat">
              <span className="grand-label">{isHe ? 'סה״כ עלות' : 'Total Cost'}</span>
              <span className="grand-value cost">{formatAmount(report.grandTotalCost, currency)}</span>
            </div>
            <div className="grand-stat">
              <span className="grand-label">{isHe ? 'סה״כ רווח גולמי' : 'Total Gross Profit'}</span>
              <span className="grand-value profit">{formatAmount(report.grandTotalProfit, currency)}</span>
            </div>
            <div className="grand-stat">
              <span className="grand-label">{isHe ? 'מרווח גולמי' : 'Gross Margin'}</span>
              <span className="grand-value">{report.grandMarginPercent.toFixed(1)}%</span>
            </div>
          </div>

          {/* Monthly Summary */}
          <div className="report-section">
            <h2>{isHe ? 'סיכום חודשי' : 'Monthly Summary'}</h2>
            <table className="data-table report-table">
              <thead>
                <tr>
                  <th>{isHe ? 'חודש' : 'Month'}</th>
                  <th>{isHe ? 'יחידות' : 'Units'}</th>
                  <th>{isHe ? 'הכנסות' : 'Revenue'}</th>
                  <th>{isHe ? 'עלות' : 'Cost'}</th>
                  <th>{isHe ? 'רווח גולמי' : 'Gross Profit'}</th>
                  <th>{isHe ? 'מרווח %' : 'Margin %'}</th>
                </tr>
              </thead>
              <tbody>
                {report.monthlySummary.map(row => (
                  <tr key={`${row.year}-${row.month}`}>
                    <td>{row.label}</td>
                    <td>{row.totalUnits.toLocaleString()}</td>
                    <td className="amount">{formatAmount(row.totalRevenue, currency)}</td>
                    <td className="amount cost">{formatAmount(row.totalCost, currency)}</td>
                    <td className="amount positive">{formatAmount(row.grossProfit, currency)}</td>
                    <td>
                      <span className={`margin-badge ${row.marginPercent >= 50 ? 'high' : row.marginPercent >= 30 ? 'medium' : 'low'}`}>
                        {row.marginPercent.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
                {/* Total row */}
                <tr className="total-row">
                  <td><strong>{isHe ? 'סה״כ' : 'TOTAL'}</strong></td>
                  <td><strong>{report.monthlySummary.reduce((s, r) => s + r.totalUnits, 0).toLocaleString()}</strong></td>
                  <td className="amount"><strong>{formatAmount(report.grandTotalRevenue, currency)}</strong></td>
                  <td className="amount cost"><strong>{formatAmount(report.grandTotalCost, currency)}</strong></td>
                  <td className="amount positive"><strong>{formatAmount(report.grandTotalProfit, currency)}</strong></td>
                  <td><strong>{report.grandMarginPercent.toFixed(1)}%</strong></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Profit Bars Chart */}
          {report.monthlySummary.length > 0 && (
            <div className="report-section">
              <h2>{isHe ? 'רווח חודשי (גרף)' : 'Monthly Profit (Chart)'}</h2>
              <div className="bar-chart">
                {report.monthlySummary.map(row => {
                  const maxProfit = Math.max(...report.monthlySummary.map(r => r.grossProfit));
                  const pct = maxProfit > 0 ? (row.grossProfit / maxProfit) * 100 : 0;
                  return (
                    <div key={`${row.year}-${row.month}`} className="bar-item">
                      <div className="bar-label">{row.label}</div>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: `${pct}%` }}>
                          <span className="bar-value">{formatAmount(row.grossProfit, currency)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Product Summary */}
          <div className="report-section">
            <h2>{isHe ? 'סיכום לפי מוצר' : 'Product Summary'}</h2>
            <table className="data-table report-table">
              <thead>
                <tr>
                  <th>{isHe ? 'מק״ט' : 'SKU'}</th>
                  <th>{isHe ? 'מוצר' : 'Product'}</th>
                  <th>{isHe ? 'סה״כ יחידות' : 'Total Units'}</th>
                  <th>{isHe ? 'סה״כ הכנסות' : 'Total Revenue'}</th>
                  <th>{isHe ? 'סה״כ עלות' : 'Total Cost'}</th>
                  <th>{isHe ? 'סה״כ רווח' : 'Total Profit'}</th>
                  <th>{isHe ? 'מרווח %' : 'Margin %'}</th>
                </tr>
              </thead>
              <tbody>
                {report.productSummary.map(row => (
                  <tr key={row.sku}>
                    <td className="mono">{row.sku}</td>
                    <td>{row.name}</td>
                    <td>{row.totalUnits.toLocaleString()}</td>
                    <td className="amount">{formatAmount(row.totalRevenue, currency)}</td>
                    <td className="amount cost">{formatAmount(row.totalCost, currency)}</td>
                    <td className="amount positive">{formatAmount(row.grossProfit, currency)}</td>
                    <td>
                      <span className={`margin-badge ${row.marginPercent >= 50 ? 'high' : row.marginPercent >= 30 ? 'medium' : 'low'}`}>
                        {row.marginPercent.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
