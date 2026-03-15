"""Currency configuration for financial reports."""

CURRENCIES = {
    "ILS": {"symbol": "₪", "name": "Israeli Shekel", "name_he": "שקל חדש"},
    "USD": {"symbol": "$", "name": "US Dollar", "name_he": "דולר אמריקאי"},
    "EUR": {"symbol": "€", "name": "Euro", "name_he": "אירו"},
    "GBP": {"symbol": "£", "name": "British Pound", "name_he": "לירה שטרלינג"},
}

DEFAULT_CURRENCY = "ILS"


def get_symbol(currency_code: str) -> str:
    return CURRENCIES.get(currency_code, {}).get("symbol", currency_code)


def format_amount(amount: float, currency_code: str, decimals: int = 2) -> str:
    symbol = get_symbol(currency_code)
    formatted = f"{amount:,.{decimals}f}"
    return f"{symbol}{formatted}"


def list_currencies() -> list[dict]:
    return [{"code": k, **v} for k, v in CURRENCIES.items()]
