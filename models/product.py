"""Product catalog model for small business financial planning."""

import csv
import json
from dataclasses import dataclass, field, asdict
from typing import Optional


@dataclass
class Product:
    """Represents a product in the business catalog."""
    sku: str
    name: str
    description: str
    category: str
    unit_cost: float          # עלות ייצור ליחידה
    selling_price: float      # מחיר מכירה ליחידה
    min_order_quantity: int = 1
    lead_time_days: int = 0   # זמן אספקה בימים
    is_active: bool = True

    @property
    def unit_margin(self) -> float:
        """Profit margin per unit."""
        return self.selling_price - self.unit_cost

    @property
    def margin_percent(self) -> float:
        """Profit margin as percentage of selling price."""
        if self.selling_price == 0:
            return 0.0
        return (self.unit_margin / self.selling_price) * 100

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "Product":
        return cls(**data)


class ProductCatalog:
    """Manages the full product catalog."""

    def __init__(self):
        self.products: dict[str, Product] = {}

    def add_product(self, product: Product) -> None:
        self.products[product.sku] = product

    def remove_product(self, sku: str) -> bool:
        if sku in self.products:
            del self.products[sku]
            return True
        return False

    def get_product(self, sku: str) -> Optional[Product]:
        return self.products.get(sku)

    def list_products(self, active_only: bool = True) -> list[Product]:
        products = list(self.products.values())
        if active_only:
            products = [p for p in products if p.is_active]
        return sorted(products, key=lambda p: p.sku)

    def list_categories(self) -> list[str]:
        return sorted(set(p.category for p in self.products.values()))

    def save_to_json(self, filepath: str) -> None:
        data = [p.to_dict() for p in self.products.values()]
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def load_from_json(self, filepath: str) -> None:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        self.products.clear()
        for item in data:
            product = Product.from_dict(item)
            self.products[product.sku] = product

    def save_to_csv(self, filepath: str) -> None:
        if not self.products:
            return
        fields = list(asdict(next(iter(self.products.values()))).keys())
        with open(filepath, "w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fields)
            writer.writeheader()
            for product in self.products.values():
                writer.writerow(product.to_dict())

    def load_from_csv(self, filepath: str) -> None:
        self.products.clear()
        with open(filepath, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                row["unit_cost"] = float(row["unit_cost"])
                row["selling_price"] = float(row["selling_price"])
                row["min_order_quantity"] = int(row["min_order_quantity"])
                row["lead_time_days"] = int(row["lead_time_days"])
                row["is_active"] = row["is_active"].lower() in ("true", "1", "yes")
                product = Product.from_dict(row)
                self.products[product.sku] = product
