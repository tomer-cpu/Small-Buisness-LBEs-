"""Rolling forecast model for financial planning."""

import json
from dataclasses import dataclass, asdict
from datetime import date, timedelta
from typing import Optional


@dataclass
class MonthlyForecast:
    """Forecast for a single product in a single month."""
    sku: str
    year: int
    month: int
    projected_units: int      # כמות יחידות צפויה למכירה
    notes: str = ""

    @property
    def month_label(self) -> str:
        return f"{self.year}-{self.month:02d}"

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "MonthlyForecast":
        return cls(**data)


class RollingForecast:
    """Manages rolling forecasts up to 12 months ahead."""

    def __init__(self):
        # key: (sku, year, month) -> MonthlyForecast
        self._forecasts: dict[tuple[str, int, int], MonthlyForecast] = {}

    def set_forecast(self, forecast: MonthlyForecast) -> None:
        key = (forecast.sku, forecast.year, forecast.month)
        self._forecasts[key] = forecast

    def get_forecast(self, sku: str, year: int, month: int) -> Optional[MonthlyForecast]:
        return self._forecasts.get((sku, year, month))

    def get_product_forecasts(self, sku: str) -> list[MonthlyForecast]:
        """Get all forecasts for a specific product, sorted by date."""
        results = [f for f in self._forecasts.values() if f.sku == sku]
        return sorted(results, key=lambda f: (f.year, f.month))

    def get_month_forecasts(self, year: int, month: int) -> list[MonthlyForecast]:
        """Get all product forecasts for a specific month."""
        return [f for f in self._forecasts.values()
                if f.year == year and f.month == month]

    def get_range_forecasts(self, start_year: int, start_month: int,
                            num_months: int) -> list[MonthlyForecast]:
        """Get all forecasts in a date range (up to 12 months)."""
        num_months = min(num_months, 12)
        months = []
        y, m = start_year, start_month
        for _ in range(num_months):
            months.append((y, m))
            m += 1
            if m > 12:
                m = 1
                y += 1
        results = [f for f in self._forecasts.values()
                   if (f.year, f.month) in months]
        return sorted(results, key=lambda f: (f.year, f.month, f.sku))

    def generate_month_list(self, start_year: int, start_month: int,
                            num_months: int) -> list[tuple[int, int]]:
        """Generate list of (year, month) tuples for the forecast range."""
        num_months = min(num_months, 12)
        months = []
        y, m = start_year, start_month
        for _ in range(num_months):
            months.append((y, m))
            m += 1
            if m > 12:
                m = 1
                y += 1
        return months

    def set_bulk_forecast(self, sku: str, start_year: int, start_month: int,
                          monthly_units: list[int]) -> None:
        """Set forecasts for multiple months at once."""
        y, m = start_year, start_month
        for units in monthly_units[:12]:
            self.set_forecast(MonthlyForecast(
                sku=sku, year=y, month=m, projected_units=units
            ))
            m += 1
            if m > 12:
                m = 1
                y += 1

    def clear_product(self, sku: str) -> None:
        keys_to_remove = [k for k in self._forecasts if k[0] == sku]
        for k in keys_to_remove:
            del self._forecasts[k]

    def clear_all(self) -> None:
        self._forecasts.clear()

    def save_to_json(self, filepath: str) -> None:
        data = [f.to_dict() for f in self._forecasts.values()]
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def load_from_json(self, filepath: str) -> None:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        self._forecasts.clear()
        for item in data:
            forecast = MonthlyForecast.from_dict(item)
            self.set_forecast(forecast)
