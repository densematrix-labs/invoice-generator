from decimal import Decimal, ROUND_HALF_UP
from typing import Literal

from pydantic import BaseModel, Field, field_validator


Currency = Literal["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CNY"]
DocumentMode = Literal["invoice", "estimate"]


class LineItem(BaseModel):
    description: str = Field(min_length=1, max_length=120)
    quantity: Decimal = Field(gt=0)
    unit_price: Decimal = Field(ge=0)


class InvoiceRequest(BaseModel):
    mode: DocumentMode = "invoice"
    currency: Currency = "USD"
    sender: str = Field(min_length=1, max_length=240)
    client: str = Field(min_length=1, max_length=240)
    tax_rate: Decimal = Field(default=Decimal("0"), ge=0, le=100)
    discount_rate: Decimal = Field(default=Decimal("0"), ge=0, le=100)
    items: list[LineItem] = Field(min_length=1, max_length=40)
    notes: str = Field(default="", max_length=1000)

    @field_validator("items")
    @classmethod
    def at_least_one_billable_item(cls, items: list[LineItem]) -> list[LineItem]:
        if not any(item.quantity * item.unit_price > 0 for item in items):
            raise ValueError("At least one line item must have a billable amount")
        return items


class InvoiceTotals(BaseModel):
    subtotal: Decimal
    discount: Decimal
    taxable_subtotal: Decimal
    tax: Decimal
    total: Decimal


class InvoiceResponse(BaseModel):
    mode: DocumentMode
    currency: Currency
    totals: InvoiceTotals
    label: str
    payment_required: bool = False


def money(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def calculate_totals(request: InvoiceRequest) -> InvoiceTotals:
    subtotal = money(sum((item.quantity * item.unit_price for item in request.items), Decimal("0")))
    discount = money(subtotal * request.discount_rate / Decimal("100"))
    taxable_subtotal = money(subtotal - discount)
    tax = money(taxable_subtotal * request.tax_rate / Decimal("100"))
    total = money(taxable_subtotal + tax)
    return InvoiceTotals(
        subtotal=subtotal,
        discount=discount,
        taxable_subtotal=taxable_subtotal,
        tax=tax,
        total=total,
    )


def document_label(mode: DocumentMode) -> str:
    return "Estimate" if mode == "estimate" else "Invoice"
