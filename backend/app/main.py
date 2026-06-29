from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.invoice import InvoiceRequest, InvoiceResponse, calculate_totals, document_label
from app.metrics import (
    TOOL_NAME,
    core_function_calls_total,
    free_trial_used_total,
    metrics_middleware,
    metrics_router,
    page_views_total,
    tokens_consumed_total,
)


app = FastAPI(title="Invoice Generator", version="1.0.0")
app.middleware("http")(metrics_middleware)
app.include_router(metrics_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

used_free_trials: set[str] = set()


class CheckoutRequest(BaseModel):
    product_sku: str
    device_id: str
    success_url: str
    cancel_url: str


class PageViewRequest(BaseModel):
    path: str


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": TOOL_NAME}


@app.post("/api/v1/invoices/preview", response_model=InvoiceResponse)
async def preview_invoice(request: InvoiceRequest, x_device_id: str | None = Header(default=None)):
    core_function_calls_total.labels(tool=TOOL_NAME).inc()
    if x_device_id:
        if x_device_id in used_free_trials:
            raise HTTPException(
                status_code=402,
                detail={
                    "error": "Free preview limit reached. Upgrade to save templates, client history, and payment links.",
                    "code": "payment_required",
                },
            )
        used_free_trials.add(x_device_id)
        free_trial_used_total.labels(tool=TOOL_NAME).inc()
    else:
        tokens_consumed_total.labels(tool=TOOL_NAME).inc()
    return InvoiceResponse(
        mode=request.mode,
        currency=request.currency,
        totals=calculate_totals(request),
        label=document_label(request.mode),
    )


@app.post("/api/v1/payment/create-checkout")
async def create_checkout(request: CheckoutRequest):
    if request.product_sku not in {"starter_monthly", "studio_monthly", "business_monthly"}:
        raise HTTPException(status_code=400, detail="Unknown product SKU")
    return {
        "checkout_url": f"{request.cancel_url}?checkout=creem-test-required&sku={request.product_sku}",
        "mode": "test_placeholder",
        "message": "Creem dashboard product IDs are required before live checkout can be enabled.",
    }


@app.post("/api/v1/page-view")
async def track_page_view(request: PageViewRequest):
    page_views_total.labels(tool=TOOL_NAME, path=request.path).inc()
    return {"ok": True}
