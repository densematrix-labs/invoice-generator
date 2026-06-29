from decimal import Decimal

import pytest
from fastapi.testclient import TestClient

from app.invoice import InvoiceRequest, LineItem, calculate_totals, document_label
from app.main import app, used_free_trials


client = TestClient(app)


def payload():
    return {
        "mode": "invoice",
        "currency": "USD",
        "sender": "DenseMatrix LLC",
        "client": "Acme Studio",
        "tax_rate": "8.25",
        "discount_rate": "10",
        "notes": "Due on receipt",
        "items": [{"description": "Design work", "quantity": "2", "unit_price": "100"}],
    }


def test_calculate_totals_with_tax_and_discount():
    request = InvoiceRequest(
        sender="A",
        client="B",
        tax_rate=Decimal("8.25"),
        discount_rate=Decimal("10"),
        items=[LineItem(description="Work", quantity=Decimal("2"), unit_price=Decimal("100"))],
    )
    totals = calculate_totals(request)
    assert totals.subtotal == Decimal("200.00")
    assert totals.discount == Decimal("20.00")
    assert totals.taxable_subtotal == Decimal("180.00")
    assert totals.tax == Decimal("14.85")
    assert totals.total == Decimal("194.85")


@pytest.mark.parametrize(("mode", "label"), [("invoice", "Invoice"), ("estimate", "Estimate")])
def test_document_label(mode, label):
    assert document_label(mode) == label


def test_health_check():
    assert client.get("/health").json()["service"] == "invoice-generator"


def test_preview_invoice_success():
    used_free_trials.clear()
    response = client.post("/api/v1/invoices/preview", json=payload(), headers={"X-Device-Id": "dev-a"})
    assert response.status_code == 200
    data = response.json()
    assert data["label"] == "Invoice"
    assert data["totals"]["total"] == "194.85"


def test_preview_invoice_second_free_use_is_402_with_error_field():
    used_free_trials.clear()
    body = payload()
    assert client.post("/api/v1/invoices/preview", json=body, headers={"X-Device-Id": "dev-b"}).status_code == 200
    response = client.post("/api/v1/invoices/preview", json=body, headers={"X-Device-Id": "dev-b"})
    assert response.status_code == 402
    detail = response.json()["detail"]
    assert detail["error"]
    assert "object Object" not in detail["error"]


def test_invalid_payload_returns_422():
    body = payload()
    body["items"] = []
    assert client.post("/api/v1/invoices/preview", json=body).status_code == 422


def test_zero_value_items_return_validation_error():
    body = payload()
    body["items"] = [{"description": "Free", "quantity": "1", "unit_price": "0"}]
    response = client.post("/api/v1/invoices/preview", json=body)
    assert response.status_code == 422
    assert "billable" in response.text


def test_checkout_rejects_unknown_sku():
    response = client.post(
        "/api/v1/payment/create-checkout",
        json={"product_sku": "bad", "device_id": "x", "success_url": "http://ok", "cancel_url": "http://cancel"},
    )
    assert response.status_code == 400


def test_checkout_success_returns_creem_placeholder_url():
    response = client.post(
        "/api/v1/payment/create-checkout",
        json={
            "product_sku": "starter_monthly",
            "device_id": "x",
            "success_url": "http://ok",
            "cancel_url": "http://cancel",
        },
    )
    assert response.status_code == 200
    assert response.json()["checkout_url"].startswith("http://cancel")


def test_page_view_tracking():
    response = client.post("/api/v1/page-view", json={"path": "/pricing"})
    assert response.json() == {"ok": True}


def test_metrics_endpoint_contains_required_metrics():
    response = client.get("/metrics")
    assert response.status_code == 200
    text = response.text
    assert "payment_success_total" in text
    assert "tokens_consumed_total" in text
    assert 'tool="invoice-generator"' in text
