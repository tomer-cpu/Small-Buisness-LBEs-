#!/usr/bin/env python3
"""
Generate sample data to demonstrate the financial planning tool.
הפקת נתוני דוגמה להדגמת הכלי.
"""

import os
from models.product import Product, ProductCatalog
from models.forecast import RollingForecast, MonthlyForecast

DATA_DIR = "data"


def create_sample_products() -> ProductCatalog:
    catalog = ProductCatalog()

    products = [
        Product(
            sku="CANDLE-001",
            name="Classic Soy Candle",
            description="Hand-poured soy wax candle, vanilla scent, 200g",
            category="Candles",
            unit_cost=12.00,
            selling_price=39.90,
            min_order_quantity=10,
            lead_time_days=3,
        ),
        Product(
            sku="CANDLE-002",
            name="Premium Candle Gift Set",
            description="3-pack scented candles in gift box",
            category="Candles",
            unit_cost=30.00,
            selling_price=89.90,
            min_order_quantity=5,
            lead_time_days=5,
        ),
        Product(
            sku="SOAP-001",
            name="Organic Soap Bar",
            description="Handmade olive oil soap, 120g",
            category="Soaps",
            unit_cost=5.50,
            selling_price=24.90,
            min_order_quantity=20,
            lead_time_days=2,
        ),
        Product(
            sku="SOAP-002",
            name="Soap Gift Box",
            description="Set of 4 assorted handmade soaps",
            category="Soaps",
            unit_cost=18.00,
            selling_price=69.90,
            min_order_quantity=10,
            lead_time_days=4,
        ),
        Product(
            sku="OIL-001",
            name="Essential Oil Blend",
            description="Lavender & eucalyptus blend, 15ml",
            category="Oils",
            unit_cost=8.00,
            selling_price=34.90,
            min_order_quantity=15,
            lead_time_days=7,
        ),
    ]

    for p in products:
        catalog.add_product(p)

    return catalog


def create_sample_forecast() -> RollingForecast:
    forecast = RollingForecast()

    # Sample forecast for 6 months starting Jan 2026
    forecasts_data = {
        "CANDLE-001": [80, 75, 90, 100, 85, 120],    # seasonal peak in June
        "CANDLE-002": [30, 25, 35, 40, 30, 50],
        "SOAP-001":   [150, 140, 160, 170, 155, 180],
        "SOAP-002":   [40, 35, 45, 50, 40, 60],
        "OIL-001":    [60, 55, 65, 70, 60, 75],
    }

    for sku, monthly_units in forecasts_data.items():
        forecast.set_bulk_forecast(sku, 2026, 1, monthly_units)

    return forecast


def main():
    os.makedirs(DATA_DIR, exist_ok=True)

    catalog = create_sample_products()
    catalog.save_to_json(os.path.join(DATA_DIR, "products.json"))
    catalog.save_to_csv(os.path.join(DATA_DIR, "products.csv"))
    print(f"Created {len(catalog.products)} sample products.")

    forecast = create_sample_forecast()
    forecast.save_to_json(os.path.join(DATA_DIR, "forecast.json"))
    print("Created sample forecast (6 months).")

    # Generate a sample report
    from engine.financial_engine import FinancialEngine
    from engine.report_formatter import format_full_report

    engine = FinancialEngine(catalog, forecast)
    report = engine.generate_report(2026, 1, 6, "ILS")
    print("\n" + format_full_report(report, engine, "he"))


if __name__ == "__main__":
    main()
