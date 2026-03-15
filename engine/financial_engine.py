"""Financial calculation engine - generates sales and profit estimates."""

from dataclasses import dataclass
from models.product import ProductCatalog, Product
from models.forecast import RollingForecast, MonthlyForecast
from models.currency import format_amount


@dataclass
class ProductMonthResult:
    """Financial result for one product in one month."""
    sku: str
    product_name: str
    year: int
    month: int
    units: int
    unit_cost: float
    selling_price: float
    total_revenue: float
    total_cost: float
    gross_profit: float
    margin_percent: float

    @property
    def month_label(self) -> str:
        return f"{self.year}-{self.month:02d}"


@dataclass
class MonthSummary:
    """Aggregated financial summary for one month."""
    year: int
    month: int
    total_units: int
    total_revenue: float
    total_cost: float
    gross_profit: float
    margin_percent: float

    @property
    def month_label(self) -> str:
        return f"{self.year}-{self.month:02d}"


@dataclass
class ForecastReport:
    """Complete forecast report with all details."""
    currency_code: str
    start_year: int
    start_month: int
    num_months: int
    product_results: list[ProductMonthResult]
    month_summaries: list[MonthSummary]
    grand_total_revenue: float
    grand_total_cost: float
    grand_total_profit: float
    grand_margin_percent: float


class FinancialEngine:
    """Calculates financial estimates from product catalog and forecasts."""

    def __init__(self, catalog: ProductCatalog, forecast: RollingForecast):
        self.catalog = catalog
        self.forecast = forecast

    def calculate_product_month(self, product: Product,
                                fc: MonthlyForecast) -> ProductMonthResult:
        """Calculate financials for one product in one month."""
        units = fc.projected_units
        total_revenue = units * product.selling_price
        total_cost = units * product.unit_cost
        gross_profit = total_revenue - total_cost
        margin_pct = (gross_profit / total_revenue * 100) if total_revenue else 0.0

        return ProductMonthResult(
            sku=product.sku,
            product_name=product.name,
            year=fc.year,
            month=fc.month,
            units=units,
            unit_cost=product.unit_cost,
            selling_price=product.selling_price,
            total_revenue=total_revenue,
            total_cost=total_cost,
            gross_profit=gross_profit,
            margin_percent=margin_pct,
        )

    def generate_report(self, start_year: int, start_month: int,
                        num_months: int, currency_code: str) -> ForecastReport:
        """Generate a complete financial forecast report."""
        num_months = min(num_months, 12)
        months = self.forecast.generate_month_list(start_year, start_month, num_months)

        product_results: list[ProductMonthResult] = []
        month_summaries: list[MonthSummary] = []

        grand_revenue = 0.0
        grand_cost = 0.0

        for year, month in months:
            month_forecasts = self.forecast.get_month_forecasts(year, month)
            month_units = 0
            month_revenue = 0.0
            month_cost = 0.0

            for fc in month_forecasts:
                product = self.catalog.get_product(fc.sku)
                if not product or not product.is_active:
                    continue

                result = self.calculate_product_month(product, fc)
                product_results.append(result)

                month_units += result.units
                month_revenue += result.total_revenue
                month_cost += result.total_cost

            month_profit = month_revenue - month_cost
            month_margin = (month_profit / month_revenue * 100) if month_revenue else 0.0

            month_summaries.append(MonthSummary(
                year=year, month=month,
                total_units=month_units,
                total_revenue=month_revenue,
                total_cost=month_cost,
                gross_profit=month_profit,
                margin_percent=month_margin,
            ))

            grand_revenue += month_revenue
            grand_cost += month_cost

        grand_profit = grand_revenue - grand_cost
        grand_margin = (grand_profit / grand_revenue * 100) if grand_revenue else 0.0

        return ForecastReport(
            currency_code=currency_code,
            start_year=start_year,
            start_month=start_month,
            num_months=num_months,
            product_results=product_results,
            month_summaries=month_summaries,
            grand_total_revenue=grand_revenue,
            grand_total_cost=grand_cost,
            grand_total_profit=grand_profit,
            grand_margin_percent=grand_margin,
        )

    def get_product_summary(self, report: ForecastReport) -> dict[str, dict]:
        """Aggregate report data per product."""
        summary: dict[str, dict] = {}
        for r in report.product_results:
            if r.sku not in summary:
                summary[r.sku] = {
                    "sku": r.sku,
                    "name": r.product_name,
                    "total_units": 0,
                    "total_revenue": 0.0,
                    "total_cost": 0.0,
                    "total_profit": 0.0,
                }
            s = summary[r.sku]
            s["total_units"] += r.units
            s["total_revenue"] += r.total_revenue
            s["total_cost"] += r.total_cost
            s["total_profit"] += r.gross_profit

        for s in summary.values():
            s["margin_percent"] = (
                (s["total_profit"] / s["total_revenue"] * 100)
                if s["total_revenue"] else 0.0
            )
        return summary
