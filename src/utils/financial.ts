import {
  ProductType,
  ForecastType,
  FullReport,
  MonthlyReportRow,
  ProductReportRow,
  CurrencyCode,
  CURRENCIES,
  MONTH_NAMES_HE,
  MONTH_NAMES_EN,
} from '../types';

export function formatAmount(amount: number, currency: CurrencyCode): string {
  const { symbol } = CURRENCIES[currency];
  return `${symbol}${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function getMarginPercent(revenue: number, cost: number): number {
  if (revenue === 0) return 0;
  return ((revenue - cost) / revenue) * 100;
}

export function getMonthLabel(year: number, month: number, lang: string): string {
  const names = lang === 'he' ? MONTH_NAMES_HE : MONTH_NAMES_EN;
  return `${names[month]} ${year}`;
}

export function generateMonthRange(
  startYear: number,
  startMonth: number,
  count: number
): Array<{ year: number; month: number }> {
  const months: Array<{ year: number; month: number }> = [];
  let y = startYear;
  let m = startMonth;
  for (let i = 0; i < Math.min(count, 12); i++) {
    months.push({ year: y, month: m });
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return months;
}

export function generateReport(
  products: ProductType[],
  forecasts: ForecastType[],
  startYear: number,
  startMonth: number,
  numMonths: number,
  lang: string
): FullReport {
  const months = generateMonthRange(startYear, startMonth, numMonths);
  const productMap = new Map(products.filter(p => p.is_active).map(p => [p.id, p]));

  const monthlySummary: MonthlyReportRow[] = [];
  const productTotals = new Map<string, ProductReportRow>();

  let grandRevenue = 0;
  let grandCost = 0;

  for (const { year, month } of months) {
    const monthForecasts = forecasts.filter(f => f.year === year && f.month === month);

    let monthUnits = 0;
    let monthRevenue = 0;
    let monthCost = 0;

    for (const fc of monthForecasts) {
      const product = productMap.get(fc.product_id);
      if (!product) continue;

      const units = fc.projected_units;
      const revenue = units * product.selling_price;
      const cost = units * product.unit_cost;

      monthUnits += units;
      monthRevenue += revenue;
      monthCost += cost;

      // Accumulate product totals
      const existing = productTotals.get(product.sku) || {
        sku: product.sku,
        name: product.name,
        totalUnits: 0,
        totalRevenue: 0,
        totalCost: 0,
        grossProfit: 0,
        marginPercent: 0,
      };
      existing.totalUnits += units;
      existing.totalRevenue += revenue;
      existing.totalCost += cost;
      existing.grossProfit += revenue - cost;
      productTotals.set(product.sku, existing);
    }

    const monthProfit = monthRevenue - monthCost;
    monthlySummary.push({
      year,
      month,
      label: getMonthLabel(year, month, lang),
      totalUnits: monthUnits,
      totalRevenue: monthRevenue,
      totalCost: monthCost,
      grossProfit: monthProfit,
      marginPercent: getMarginPercent(monthRevenue, monthCost),
    });

    grandRevenue += monthRevenue;
    grandCost += monthCost;
  }

  // Calculate margin for each product
  const productSummary = Array.from(productTotals.values()).map(p => ({
    ...p,
    marginPercent: getMarginPercent(p.totalRevenue, p.totalCost),
  })).sort((a, b) => b.grossProfit - a.grossProfit);

  const grandProfit = grandRevenue - grandCost;

  return {
    monthlySummary,
    productSummary,
    grandTotalRevenue: grandRevenue,
    grandTotalCost: grandCost,
    grandTotalProfit: grandProfit,
    grandMarginPercent: getMarginPercent(grandRevenue, grandCost),
  };
}
