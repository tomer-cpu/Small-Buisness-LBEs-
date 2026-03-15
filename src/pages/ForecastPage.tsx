import { useEffect, useState } from 'react';
import { Product, Forecast } from '../sdk-client/base44-client';
import { generateMonthRange, getMonthLabel } from '../utils/financial';
import type { ProductType, ForecastType, CurrencyCode } from '../types';

interface Props {
  currency: CurrencyCode;
  lang: string;
}

export default function ForecastPage({ currency, lang }: Props) {
  const [products, setProducts] = useState<ProductType[]>([]);
  const [forecasts, setForecasts] = useState<ForecastType[]>([]);
  const [loading, setLoading] = useState(true);

  // Forecast entry form
  const [selectedProduct, setSelectedProduct] = useState('');
  const now = new Date();
  const [startYear, setStartYear] = useState(now.getFullYear());
  const [startMonth, setStartMonth] = useState(now.getMonth() + 1);
  const [numMonths, setNumMonths] = useState(6);
  const [monthlyUnits, setMonthlyUnits] = useState<number[]>([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkUnits, setBulkUnits] = useState('');

  const isHe = lang === 'he';

  useEffect(() => {
    Promise.all([Product.list(), Forecast.list()])
      .then(([prods, fcs]) => {
        setProducts(prods.filter(p => p.is_active));
        setForecasts(fcs);
      })
      .finally(() => setLoading(false));
  }, []);

  const months = generateMonthRange(startYear, startMonth, numMonths);

  // When product or range changes, load existing forecasts
  useEffect(() => {
    if (!selectedProduct) {
      setMonthlyUnits(months.map(() => 0));
      return;
    }
    const units = months.map(({ year, month }) => {
      const existing = forecasts.find(
        f => f.product_id === selectedProduct && f.year === year && f.month === month
      );
      return existing ? existing.projected_units : 0;
    });
    setMonthlyUnits(units);
  }, [selectedProduct, startYear, startMonth, numMonths, forecasts.length]);

  const handleUnitChange = (index: number, value: string) => {
    const newUnits = [...monthlyUnits];
    newUnits[index] = parseInt(value) || 0;
    setMonthlyUnits(newUnits);
  };

  const handleBulkApply = () => {
    const val = parseInt(bulkUnits) || 0;
    setMonthlyUnits(months.map(() => val));
  };

  const handleSave = async () => {
    if (!selectedProduct) return;
    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;

    for (let i = 0; i < months.length; i++) {
      const { year, month } = months[i];
      const existing = forecasts.find(
        f => f.product_id === selectedProduct && f.year === year && f.month === month
      );
      if (existing) {
        await Forecast.update(existing.id, { projected_units: monthlyUnits[i] });
      } else {
        await Forecast.create({
          product_id: selectedProduct,
          sku: product.sku,
          year,
          month,
          projected_units: monthlyUnits[i],
        });
      }
    }

    // Reload forecasts
    const updated = await Forecast.list();
    setForecasts(updated);
    alert(isHe ? 'התחזית נשמרה בהצלחה!' : 'Forecast saved!');
  };

  const handleClearProduct = async () => {
    if (!selectedProduct) return;
    const msg = isHe ? 'למחוק את כל התחזיות למוצר זה?' : 'Clear all forecasts for this product?';
    if (!window.confirm(msg)) return;

    const productForecasts = forecasts.filter(f => f.product_id === selectedProduct);
    for (const fc of productForecasts) {
      await Forecast.delete(fc.id);
    }
    const updated = await Forecast.list();
    setForecasts(updated);
    setMonthlyUnits(months.map(() => 0));
  };

  if (loading) return <div className="loading">{isHe ? 'טוען...' : 'Loading...'}</div>;

  return (
    <div className="forecast-page">
      <h1>{isHe ? 'תחזית מתגלגלת' : 'Rolling Forecast'}</h1>

      {products.length === 0 ? (
        <div className="empty-state">
          <p>{isHe ? 'אין מוצרים פעילים. הוסף מוצרים קודם.' : 'No active products. Add products first.'}</p>
        </div>
      ) : (
        <>
          <div className="forecast-controls">
            <div className="form-group">
              <label>{isHe ? 'בחר מוצר' : 'Select Product'}</label>
              <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)}>
                <option value="">{isHe ? '-- בחר מוצר --' : '-- Select --'}</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
                ))}
              </select>
            </div>

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
                <label>{isHe ? 'מספר חודשים' : 'Months'}</label>
                <select value={numMonths} onChange={e => setNumMonths(parseInt(e.target.value))}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {selectedProduct && (
            <div className="forecast-entry">
              <div className="bulk-entry">
                <label>
                  <input type="checkbox" checked={bulkMode}
                    onChange={e => setBulkMode(e.target.checked)} />
                  {isHe ? 'הזנה אחידה לכל החודשים' : 'Bulk entry (same for all months)'}
                </label>
                {bulkMode && (
                  <div className="bulk-controls">
                    <input type="number" min="0" value={bulkUnits}
                      onChange={e => setBulkUnits(e.target.value)}
                      placeholder={isHe ? 'יחידות לחודש' : 'Units per month'} />
                    <button className="btn btn-sm" onClick={handleBulkApply}>
                      {isHe ? 'החל' : 'Apply'}
                    </button>
                  </div>
                )}
              </div>

              <div className="forecast-grid">
                {months.map(({ year, month }, i) => (
                  <div key={`${year}-${month}`} className="forecast-month-cell">
                    <label>{getMonthLabel(year, month, lang)}</label>
                    <input
                      type="number"
                      min="0"
                      value={monthlyUnits[i] || 0}
                      onChange={e => handleUnitChange(i, e.target.value)}
                    />
                    <span className="unit-label">{isHe ? 'יחידות' : 'units'}</span>
                  </div>
                ))}
              </div>

              <div className="forecast-actions">
                <button className="btn btn-primary" onClick={handleSave}>
                  {isHe ? 'שמירת תחזית' : 'Save Forecast'}
                </button>
                <button className="btn btn-danger" onClick={handleClearProduct}>
                  {isHe ? 'מחיקת תחזית למוצר' : 'Clear Product Forecast'}
                </button>
              </div>
            </div>
          )}

          {/* Summary of all forecasts */}
          <div className="forecast-summary">
            <h2>{isHe ? 'סיכום תחזיות קיימות' : 'Existing Forecasts Summary'}</h2>
            {forecasts.length === 0 ? (
              <p className="muted">{isHe ? 'אין תחזיות עדיין' : 'No forecasts yet'}</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{isHe ? 'מק״ט' : 'SKU'}</th>
                    <th>{isHe ? 'חודש' : 'Month'}</th>
                    <th>{isHe ? 'יחידות צפויות' : 'Projected Units'}</th>
                  </tr>
                </thead>
                <tbody>
                  {forecasts
                    .sort((a, b) => a.sku.localeCompare(b.sku) || a.year - b.year || a.month - b.month)
                    .map(fc => (
                      <tr key={fc.id}>
                        <td className="mono">{fc.sku}</td>
                        <td>{getMonthLabel(fc.year, fc.month, lang)}</td>
                        <td>{fc.projected_units.toLocaleString()}</td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
