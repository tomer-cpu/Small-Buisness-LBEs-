export type View =
  | { type: 'dashboard' }
  | { type: 'products' }
  | { type: 'forecast' }
  | { type: 'reports' }
  | { type: 'notebooklm' }
  | { type: 'chat' };

export type CurrencyCode = 'ILS' | 'USD' | 'EUR' | 'GBP';
export type Language = 'he' | 'en';

export interface ProductType {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category?: string;
  unit_cost: number;
  selling_price: number;
  min_order_quantity?: number;
  lead_time_days?: number;
  is_active: boolean;
}

export interface ForecastType {
  id: string;
  product_id: string;
  sku: string;
  year: number;
  month: number;
  projected_units: number;
  notes?: string;
}

export interface AppSettingsType {
  id?: string;
  currency: CurrencyCode;
  language: Language;
  business_name?: string;
}

export interface MonthlyReportRow {
  year: number;
  month: number;
  label: string;
  totalUnits: number;
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  marginPercent: number;
}

export interface ProductReportRow {
  sku: string;
  name: string;
  totalUnits: number;
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  marginPercent: number;
}

export interface FullReport {
  monthlySummary: MonthlyReportRow[];
  productSummary: ProductReportRow[];
  grandTotalRevenue: number;
  grandTotalCost: number;
  grandTotalProfit: number;
  grandMarginPercent: number;
}

export const CURRENCIES: Record<CurrencyCode, { symbol: string; name: string; nameHe: string }> = {
  ILS: { symbol: '₪', name: 'Israeli Shekel', nameHe: 'שקל חדש' },
  USD: { symbol: '$', name: 'US Dollar', nameHe: 'דולר אמריקאי' },
  EUR: { symbol: '€', name: 'Euro', nameHe: 'אירו' },
  GBP: { symbol: '£', name: 'British Pound', nameHe: 'לירה שטרלינג' },
};

export const MONTH_NAMES_HE = [
  '', 'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

export const MONTH_NAMES_EN = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
