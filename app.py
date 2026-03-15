#!/usr/bin/env python3
"""
Small Business Financial Planning Tool
כלי תכנון פיננסי לעסקים קטנים

Interactive CLI for managing products, forecasts, and financial reports.
"""

import os
import sys
from datetime import date

from models.product import Product, ProductCatalog
from models.forecast import RollingForecast, MonthlyForecast
from models.currency import list_currencies, DEFAULT_CURRENCY, format_amount
from engine.financial_engine import FinancialEngine
from engine.report_formatter import format_full_report
from engine.excel_export import export_to_excel

DATA_DIR = "data"
PRODUCTS_FILE = os.path.join(DATA_DIR, "products.json")
FORECAST_FILE = os.path.join(DATA_DIR, "forecast.json")


def ensure_data_dir():
    os.makedirs(DATA_DIR, exist_ok=True)


def clear_screen():
    os.system("cls" if os.name == "nt" else "clear")


def print_header():
    print("=" * 60)
    print("  Small Business Financial Planning Tool")
    print("  כלי תכנון פיננסי לעסקים קטנים")
    print("=" * 60)
    print()


def input_int(prompt: str, default: int = 0) -> int:
    val = input(f"{prompt} [{default}]: ").strip()
    if not val:
        return default
    try:
        return int(val)
    except ValueError:
        print("  Invalid number, using default.")
        return default


def input_float(prompt: str, default: float = 0.0) -> float:
    val = input(f"{prompt} [{default}]: ").strip()
    if not val:
        return default
    try:
        return float(val)
    except ValueError:
        print("  Invalid number, using default.")
        return default


class App:
    def __init__(self):
        self.catalog = ProductCatalog()
        self.forecast = RollingForecast()
        self.currency = DEFAULT_CURRENCY
        ensure_data_dir()
        self._load_data()

    def _load_data(self):
        if os.path.exists(PRODUCTS_FILE):
            try:
                self.catalog.load_from_json(PRODUCTS_FILE)
                print(f"  Loaded {len(self.catalog.products)} products.")
            except Exception as e:
                print(f"  Warning: Could not load products: {e}")

        if os.path.exists(FORECAST_FILE):
            try:
                self.forecast.load_from_json(FORECAST_FILE)
                print(f"  Loaded forecast data.")
            except Exception as e:
                print(f"  Warning: Could not load forecast: {e}")

    def _save_data(self):
        ensure_data_dir()
        self.catalog.save_to_json(PRODUCTS_FILE)
        self.forecast.save_to_json(FORECAST_FILE)

    def run(self):
        print_header()
        while True:
            self._show_menu()
            choice = input("\nSelect option: ").strip()
            print()

            actions = {
                "1": self._manage_products,
                "2": self._manage_forecast,
                "3": self._generate_report,
                "4": self._export_excel,
                "5": self._set_currency,
                "6": self._import_export_data,
                "0": self._exit,
            }

            action = actions.get(choice)
            if action:
                action()
            else:
                print("Invalid option. Try again.")

    def _show_menu(self):
        print(f"\n--- Main Menu --- (Currency: {self.currency})")
        print("  1. Manage Products (ניהול מוצרים)")
        print("  2. Manage Forecast (ניהול תחזיות)")
        print("  3. Generate Report (הפקת דוח)")
        print("  4. Export to Excel (ייצוא לאקסל)")
        print("  5. Set Currency (בחירת מטבע)")
        print("  6. Import/Export Data (ייבוא/ייצוא נתונים)")
        print("  0. Exit (יציאה)")

    # ── Product Management ──────────────────────────────────────

    def _manage_products(self):
        while True:
            print("\n--- Products Menu ---")
            print("  1. List all products (הצגת כל המוצרים)")
            print("  2. Add product (הוספת מוצר)")
            print("  3. Edit product (עריכת מוצר)")
            print("  4. Remove product (הסרת מוצר)")
            print("  0. Back (חזרה)")

            choice = input("\nSelect: ").strip()

            if choice == "1":
                self._list_products()
            elif choice == "2":
                self._add_product()
            elif choice == "3":
                self._edit_product()
            elif choice == "4":
                self._remove_product()
            elif choice == "0":
                return
            else:
                print("Invalid option.")

    def _list_products(self):
        products = self.catalog.list_products(active_only=False)
        if not products:
            print("  No products in catalog.")
            return

        print(f"\n{'SKU':<12} {'Name':<20} {'Category':<15} "
              f"{'Cost':>10} {'Price':>10} {'Margin':>8} {'Active':>6}")
        print("-" * 85)
        for p in products:
            print(f"{p.sku:<12} {p.name:<20} {p.category:<15} "
                  f"{format_amount(p.unit_cost, self.currency):>10} "
                  f"{format_amount(p.selling_price, self.currency):>10} "
                  f"{p.margin_percent:>7.1f}% "
                  f"{'Yes' if p.is_active else 'No':>6}")

    def _add_product(self):
        print("\n--- Add New Product ---")
        sku = input("  SKU (מק״ט): ").strip()
        if not sku:
            print("  SKU is required.")
            return
        if self.catalog.get_product(sku):
            print(f"  Product {sku} already exists.")
            return

        name = input("  Product name (שם מוצר): ").strip()
        description = input("  Description (תיאור): ").strip()
        category = input("  Category (קטגוריה): ").strip()
        unit_cost = input_float("  Unit cost (עלות ייצור)")
        selling_price = input_float("  Selling price (מחיר מכירה)")
        min_order = input_int("  Min order quantity (כמות מינימום)", 1)
        lead_time = input_int("  Lead time in days (זמן אספקה)", 0)

        product = Product(
            sku=sku, name=name, description=description,
            category=category, unit_cost=unit_cost,
            selling_price=selling_price, min_order_quantity=min_order,
            lead_time_days=lead_time,
        )
        self.catalog.add_product(product)
        self._save_data()
        print(f"  Product {sku} added. Margin: {product.margin_percent:.1f}%")

    def _edit_product(self):
        sku = input("  Enter SKU to edit: ").strip()
        product = self.catalog.get_product(sku)
        if not product:
            print(f"  Product {sku} not found.")
            return

        print(f"  Editing {product.name} ({sku})")
        print("  Press Enter to keep current value.\n")

        name = input(f"  Name [{product.name}]: ").strip()
        if name:
            product.name = name

        desc = input(f"  Description [{product.description}]: ").strip()
        if desc:
            product.description = desc

        cat = input(f"  Category [{product.category}]: ").strip()
        if cat:
            product.category = cat

        cost_str = input(f"  Unit cost [{product.unit_cost}]: ").strip()
        if cost_str:
            try:
                product.unit_cost = float(cost_str)
            except ValueError:
                pass

        price_str = input(f"  Selling price [{product.selling_price}]: ").strip()
        if price_str:
            try:
                product.selling_price = float(price_str)
            except ValueError:
                pass

        active_str = input(f"  Active (yes/no) [{'yes' if product.is_active else 'no'}]: ").strip()
        if active_str.lower() in ("yes", "y"):
            product.is_active = True
        elif active_str.lower() in ("no", "n"):
            product.is_active = False

        self._save_data()
        print(f"  Product {sku} updated.")

    def _remove_product(self):
        sku = input("  Enter SKU to remove: ").strip()
        if self.catalog.remove_product(sku):
            self.forecast.clear_product(sku)
            self._save_data()
            print(f"  Product {sku} removed.")
        else:
            print(f"  Product {sku} not found.")

    # ── Forecast Management ─────────────────────────────────────

    def _manage_forecast(self):
        while True:
            print("\n--- Forecast Menu ---")
            print("  1. Set forecast for product (הגדרת תחזית למוצר)")
            print("  2. View forecasts (הצגת תחזיות)")
            print("  3. Quick bulk entry (הזנה מהירה)")
            print("  4. Clear forecasts (מחיקת תחזיות)")
            print("  0. Back (חזרה)")

            choice = input("\nSelect: ").strip()

            if choice == "1":
                self._set_product_forecast()
            elif choice == "2":
                self._view_forecasts()
            elif choice == "3":
                self._bulk_forecast_entry()
            elif choice == "4":
                self._clear_forecasts()
            elif choice == "0":
                return

    def _set_product_forecast(self):
        self._list_products()
        sku = input("\n  Enter SKU: ").strip()
        product = self.catalog.get_product(sku)
        if not product:
            print(f"  Product {sku} not found.")
            return

        today = date.today()
        start_year = input_int("  Start year (שנת התחלה)", today.year)
        start_month = input_int("  Start month (חודש התחלה, 1-12)", today.month)
        num_months = input_int("  Number of months (מספר חודשים, 1-12)", 6)
        num_months = max(1, min(12, num_months))

        months = self.forecast.generate_month_list(start_year, start_month, num_months)
        print(f"\n  Enter projected units for {product.name}:")

        for y, m in months:
            existing = self.forecast.get_forecast(sku, y, m)
            default = existing.projected_units if existing else 0
            units = input_int(f"    {y}-{m:02d}", default)
            self.forecast.set_forecast(MonthlyForecast(
                sku=sku, year=y, month=m, projected_units=units
            ))

        self._save_data()
        print("  Forecast saved.")

    def _bulk_forecast_entry(self):
        """Set the same units for all months for a product."""
        self._list_products()
        sku = input("\n  Enter SKU: ").strip()
        product = self.catalog.get_product(sku)
        if not product:
            print(f"  Product {sku} not found.")
            return

        today = date.today()
        start_year = input_int("  Start year", today.year)
        start_month = input_int("  Start month (1-12)", today.month)
        num_months = input_int("  Number of months (1-12)", 6)
        num_months = max(1, min(12, num_months))

        units = input_int("  Monthly units (same for all months)")
        monthly_units = [units] * num_months
        self.forecast.set_bulk_forecast(sku, start_year, start_month, monthly_units)
        self._save_data()
        print(f"  Set {units} units/month for {num_months} months.")

    def _view_forecasts(self):
        today = date.today()
        start_year = input_int("  Start year", today.year)
        start_month = input_int("  Start month (1-12)", today.month)
        num_months = input_int("  Number of months (1-12)", 6)
        num_months = max(1, min(12, num_months))

        forecasts = self.forecast.get_range_forecasts(start_year, start_month, num_months)
        if not forecasts:
            print("  No forecasts found for this range.")
            return

        print(f"\n{'SKU':<12} {'Month':<10} {'Projected Units':>15} {'Notes'}")
        print("-" * 50)
        for fc in forecasts:
            product = self.catalog.get_product(fc.sku)
            name = product.name if product else fc.sku
            print(f"{fc.sku:<12} {fc.month_label:<10} {fc.projected_units:>15,} {fc.notes}")

    def _clear_forecasts(self):
        print("  1. Clear for specific product")
        print("  2. Clear all forecasts")
        choice = input("  Select: ").strip()
        if choice == "1":
            sku = input("  Enter SKU: ").strip()
            self.forecast.clear_product(sku)
            self._save_data()
            print(f"  Forecasts cleared for {sku}.")
        elif choice == "2":
            confirm = input("  Are you sure? (yes/no): ").strip()
            if confirm.lower() in ("yes", "y"):
                self.forecast.clear_all()
                self._save_data()
                print("  All forecasts cleared.")

    # ── Reports ─────────────────────────────────────────────────

    def _generate_report(self):
        if not self.catalog.products:
            print("  No products loaded. Add products first.")
            return

        today = date.today()
        start_year = input_int("  Start year", today.year)
        start_month = input_int("  Start month (1-12)", today.month)
        num_months = input_int("  Number of months (1-12)", 6)
        num_months = max(1, min(12, num_months))

        lang_choice = input("  Language (en/he) [en]: ").strip() or "en"

        engine = FinancialEngine(self.catalog, self.forecast)
        report = engine.generate_report(start_year, start_month,
                                        num_months, self.currency)

        print()
        print(format_full_report(report, engine, lang_choice))

    def _export_excel(self):
        if not self.catalog.products:
            print("  No products loaded.")
            return

        today = date.today()
        start_year = input_int("  Start year", today.year)
        start_month = input_int("  Start month (1-12)", today.month)
        num_months = input_int("  Number of months (1-12)", 6)
        num_months = max(1, min(12, num_months))

        engine = FinancialEngine(self.catalog, self.forecast)
        report = engine.generate_report(start_year, start_month,
                                        num_months, self.currency)

        default_path = os.path.join(DATA_DIR, "forecast_report.xlsx")
        filepath = input(f"  Output file [{default_path}]: ").strip() or default_path

        export_to_excel(report, engine, filepath)
        print(f"  Report exported to: {filepath}")

    # ── Currency ────────────────────────────────────────────────

    def _set_currency(self):
        print("\n  Available currencies:")
        for c in list_currencies():
            marker = " <--" if c["code"] == self.currency else ""
            print(f"    {c['code']}  {c['symbol']}  {c['name']} ({c['name_he']}){marker}")
        code = input("\n  Enter currency code: ").strip().upper()
        valid_codes = [c["code"] for c in list_currencies()]
        if code in valid_codes:
            self.currency = code
            print(f"  Currency set to {code}.")
        else:
            print(f"  Invalid code. Choose from: {', '.join(valid_codes)}")

    # ── Import/Export ───────────────────────────────────────────

    def _import_export_data(self):
        print("\n--- Import/Export ---")
        print("  1. Export products to CSV")
        print("  2. Import products from CSV")
        print("  3. Save all data (JSON)")
        print("  0. Back")

        choice = input("\nSelect: ").strip()
        if choice == "1":
            path = input(f"  CSV path [{DATA_DIR}/products.csv]: ").strip()
            path = path or os.path.join(DATA_DIR, "products.csv")
            self.catalog.save_to_csv(path)
            print(f"  Exported to {path}")
        elif choice == "2":
            path = input("  CSV file path: ").strip()
            if os.path.exists(path):
                self.catalog.load_from_csv(path)
                self._save_data()
                print(f"  Imported {len(self.catalog.products)} products.")
            else:
                print(f"  File not found: {path}")
        elif choice == "3":
            self._save_data()
            print("  Data saved.")

    def _exit(self):
        self._save_data()
        print("\n  Data saved. Goodbye! (להתראות)")
        sys.exit(0)


if __name__ == "__main__":
    App().run()
