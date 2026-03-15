import { useEffect, useState } from 'react';
import { Product, Forecast } from '../sdk-client/base44-client';
import { formatAmount, getMarginPercent } from '../utils/financial';
import type { ProductType, ForecastType, CurrencyCode } from '../types';

interface Props {
  currency: CurrencyCode;
  lang: string;
}

export default function Dashboard({ currency, lang }: Props) {
  const [products, setProducts] = useState<ProductType[]>([]);
  const [forecasts, setForecasts] = useState<ForecastType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([Product.list(), Forecast.list()])
      .then(([prods, fcs]) => {
        setProducts(prods);
        setForecasts(fcs);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="loading">{lang === 'he' ? 'טוען...' : 'Loading...'}</div>;
  }

  const activeProducts = products.filter(p => p.is_active);
  const totalProducts = activeProducts.length;
  const totalForecasts = forecasts.length;

  // Calculate totals from all forecasts
  let totalRevenue = 0;
  let totalCost = 0;
  let totalUnits = 0;
  const productMap = new Map(activeProducts.map(p => [p.id, p]));

  for (const fc of forecasts) {
    const product = productMap.get(fc.product_id);
    if (!product) continue;
    totalUnits += fc.projected_units;
    totalRevenue += fc.projected_units * product.selling_price;
    totalCost += fc.projected_units * product.unit_cost;
  }
  const totalProfit = totalRevenue - totalCost;
  const margin = getMarginPercent(totalRevenue, totalCost);

  // Top products by projected profit
  const productProfits = new Map<string, { name: string; profit: number; units: number }>();
  for (const fc of forecasts) {
    const product = productMap.get(fc.product_id);
    if (!product) continue;
    const profit = fc.projected_units * (product.selling_price - product.unit_cost);
    const existing = productProfits.get(product.sku) || { name: product.name, profit: 0, units: 0 };
    existing.profit += profit;
    existing.units += fc.projected_units;
    productProfits.set(product.sku, existing);
  }
  const topProducts = Array.from(productProfits.entries())
    .sort((a, b) => b[1].profit - a[1].profit)
    .slice(0, 5);

  const isHe = lang === 'he';

  return (
    <div className="dashboard-page">
      <h1>{isHe ? 'לוח בקרה' : 'Dashboard'}</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-value">{totalProducts}</div>
          <div className="stat-label">{isHe ? 'מוצרים פעילים' : 'Active Products'}</div>
        </div>
        <div className="stat-card revenue">
          <div className="stat-icon">💰</div>
          <div className="stat-value">{formatAmount(totalRevenue, currency)}</div>
          <div className="stat-label">{isHe ? 'הכנסות צפויות' : 'Projected Revenue'}</div>
        </div>
        <div className="stat-card profit">
          <div className="stat-icon">📈</div>
          <div className="stat-value">{formatAmount(totalProfit, currency)}</div>
          <div className="stat-label">{isHe ? 'רווח גולמי צפוי' : 'Projected Gross Profit'}</div>
        </div>
        <div className="stat-card margin">
          <div className="stat-icon">📊</div>
          <div className="stat-value">{margin.toFixed(1)}%</div>
          <div className="stat-label">{isHe ? 'מרווח גולמי' : 'Gross Margin'}</div>
        </div>
      </div>

      {topProducts.length > 0 && (
        <div className="dashboard-section">
          <h2>{isHe ? 'מוצרים מובילים לפי רווח' : 'Top Products by Profit'}</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>{isHe ? 'מק״ט' : 'SKU'}</th>
                <th>{isHe ? 'מוצר' : 'Product'}</th>
                <th>{isHe ? 'יחידות' : 'Units'}</th>
                <th>{isHe ? 'רווח צפוי' : 'Projected Profit'}</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map(([sku, data]) => (
                <tr key={sku}>
                  <td className="mono">{sku}</td>
                  <td>{data.name}</td>
                  <td>{data.units.toLocaleString()}</td>
                  <td className="amount positive">{formatAmount(data.profit, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalProducts === 0 && (
        <div className="empty-state">
          <p>{isHe
            ? 'עדיין לא הוספת מוצרים. התחל על ידי הוספת מוצרים בתפריט "מוצרים".'
            : 'No products yet. Start by adding products in the "Products" menu.'
          }</p>
        </div>
      )}
    </div>
  );
}
