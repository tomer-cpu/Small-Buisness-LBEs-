"""Format financial reports for display and export."""

from tabulate import tabulate
from models.currency import format_amount, get_symbol
from engine.financial_engine import ForecastReport, FinancialEngine

MONTH_NAMES_HE = {
    1: "ינואר", 2: "פברואר", 3: "מרץ", 4: "אפריל",
    5: "מאי", 6: "יוני", 7: "יולי", 8: "אוגוסט",
    9: "ספטמבר", 10: "אוקטובר", 11: "נובמבר", 12: "דצמבר",
}

MONTH_NAMES_EN = {
    1: "Jan", 2: "Feb", 3: "Mar", 4: "Apr",
    5: "May", 6: "Jun", 7: "Jul", 8: "Aug",
    9: "Sep", 10: "Oct", 11: "Nov", 12: "Dec",
}


def format_monthly_summary(report: ForecastReport, lang: str = "en") -> str:
    """Format the monthly summary table."""
    month_names = MONTH_NAMES_EN if lang == "en" else MONTH_NAMES_HE
    cc = report.currency_code

    headers = ["Month", "Units", "Revenue", "Cost", "Gross Profit", "Margin %"]
    if lang == "he":
        headers = ["חודש", "יחידות", "הכנסות", "עלות", "רווח גולמי", "מרווח %"]

    rows = []
    for ms in report.month_summaries:
        label = f"{month_names[ms.month]} {ms.year}"
        rows.append([
            label,
            f"{ms.total_units:,}",
            format_amount(ms.total_revenue, cc),
            format_amount(ms.total_cost, cc),
            format_amount(ms.gross_profit, cc),
            f"{ms.margin_percent:.1f}%",
        ])

    # Grand total row
    total_label = "TOTAL" if lang == "en" else "סה״כ"
    rows.append([
        f"** {total_label} **",
        f"{sum(ms.total_units for ms in report.month_summaries):,}",
        format_amount(report.grand_total_revenue, cc),
        format_amount(report.grand_total_cost, cc),
        format_amount(report.grand_total_profit, cc),
        f"{report.grand_margin_percent:.1f}%",
    ])

    return tabulate(rows, headers=headers, tablefmt="grid", stralign="right")


def format_product_detail(report: ForecastReport, lang: str = "en") -> str:
    """Format detailed product-level breakdown."""
    cc = report.currency_code
    month_names = MONTH_NAMES_EN if lang == "en" else MONTH_NAMES_HE

    headers = ["SKU", "Product", "Month", "Units", "Unit Price",
               "Revenue", "Cost", "Profit", "Margin %"]
    if lang == "he":
        headers = ["מק״ט", "מוצר", "חודש", "יחידות", "מחיר יחידה",
                    "הכנסות", "עלות", "רווח", "מרווח %"]

    rows = []
    for r in report.product_results:
        label = f"{month_names[r.month]} {r.year}"
        rows.append([
            r.sku,
            r.product_name,
            label,
            f"{r.units:,}",
            format_amount(r.selling_price, cc),
            format_amount(r.total_revenue, cc),
            format_amount(r.total_cost, cc),
            format_amount(r.gross_profit, cc),
            f"{r.margin_percent:.1f}%",
        ])

    return tabulate(rows, headers=headers, tablefmt="grid", stralign="right")


def format_product_summary(report: ForecastReport,
                           engine: FinancialEngine,
                           lang: str = "en") -> str:
    """Format aggregated per-product summary."""
    cc = report.currency_code
    summary = engine.get_product_summary(report)

    headers = ["SKU", "Product", "Total Units", "Total Revenue",
               "Total Cost", "Total Profit", "Margin %"]
    if lang == "he":
        headers = ["מק״ט", "מוצר", "סה״כ יחידות", "סה״כ הכנסות",
                    "סה״כ עלות", "סה״כ רווח", "מרווח %"]

    rows = []
    for s in sorted(summary.values(), key=lambda x: x["total_profit"], reverse=True):
        rows.append([
            s["sku"],
            s["name"],
            f"{s['total_units']:,}",
            format_amount(s["total_revenue"], cc),
            format_amount(s["total_cost"], cc),
            format_amount(s["total_profit"], cc),
            f"{s['margin_percent']:.1f}%",
        ])

    return tabulate(rows, headers=headers, tablefmt="grid", stralign="right")


def format_full_report(report: ForecastReport,
                       engine: FinancialEngine,
                       lang: str = "en") -> str:
    """Generate the complete formatted report."""
    sym = get_symbol(report.currency_code)
    lines = []

    if lang == "he":
        lines.append("=" * 70)
        lines.append("   דוח תחזית פיננסית מתגלגלת לעסק קטן")
        lines.append(f"   מטבע: {report.currency_code} ({sym})")
        lines.append(f"   תקופה: {report.num_months} חודשים")
        lines.append("=" * 70)
        lines.append("")
        lines.append("--- סיכום חודשי ---")
    else:
        lines.append("=" * 70)
        lines.append("   Small Business Rolling Financial Forecast")
        lines.append(f"   Currency: {report.currency_code} ({sym})")
        lines.append(f"   Period: {report.num_months} months")
        lines.append("=" * 70)
        lines.append("")
        lines.append("--- Monthly Summary ---")

    lines.append(format_monthly_summary(report, lang))
    lines.append("")

    if lang == "he":
        lines.append("--- סיכום לפי מוצר ---")
    else:
        lines.append("--- Product Summary ---")
    lines.append(format_product_summary(report, engine, lang))
    lines.append("")

    if lang == "he":
        lines.append("--- פירוט לפי מוצר וחודש ---")
    else:
        lines.append("--- Product Detail by Month ---")
    lines.append(format_product_detail(report, lang))

    return "\n".join(lines)
