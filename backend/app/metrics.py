import os

from fastapi import APIRouter, Request
from fastapi.responses import Response
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Gauge, Histogram, generate_latest


TOOL_NAME = os.getenv("TOOL_NAME", "invoice-generator")

http_requests_total = Counter(
    "http_requests_total",
    "HTTP requests",
    ["tool", "endpoint", "method", "status"],
)
http_request_duration_seconds = Histogram(
    "http_request_duration_seconds",
    "HTTP request duration",
    ["tool", "endpoint", "method"],
)
payment_success_total = Counter(
    "payment_success_total",
    "Successful payments",
    ["tool", "product_sku"],
)
payment_revenue_cents_total = Counter(
    "payment_revenue_cents_total",
    "Payment revenue in cents",
    ["tool", "product_sku"],
)
tokens_consumed_total = Counter("tokens_consumed_total", "Tokens consumed", ["tool"])
free_trial_used_total = Counter("free_trial_used_total", "Free trials used", ["tool"])
core_function_calls_total = Counter("core_function_calls_total", "Core function calls", ["tool"])
page_views_total = Counter("page_views_total", "Tracked page views", ["tool", "path"])
programmatic_pages_count = Gauge("programmatic_pages_count", "Programmatic SEO page count", ["tool"])
crawler_visits_total = Counter("crawler_visits_total", "Crawler visits", ["tool", "bot"])

metrics_router = APIRouter()


@metrics_router.get("/metrics")
async def metrics() -> Response:
    programmatic_pages_count.labels(tool=TOOL_NAME).set(6000)
    payment_success_total.labels(tool=TOOL_NAME, product_sku="starter_monthly").inc(0)
    payment_revenue_cents_total.labels(tool=TOOL_NAME, product_sku="starter_monthly").inc(0)
    tokens_consumed_total.labels(tool=TOOL_NAME).inc(0)
    free_trial_used_total.labels(tool=TOOL_NAME).inc(0)
    core_function_calls_total.labels(tool=TOOL_NAME).inc(0)
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


async def metrics_middleware(request: Request, call_next):
    endpoint = request.url.path
    method = request.method
    user_agent = request.headers.get("user-agent", "")
    for bot in ["Googlebot", "bingbot", "Baiduspider", "YandexBot", "DuckDuckBot"]:
        if bot.lower() in user_agent.lower():
            crawler_visits_total.labels(tool=TOOL_NAME, bot=bot).inc()
            break
    with http_request_duration_seconds.labels(tool=TOOL_NAME, endpoint=endpoint, method=method).time():
        response = await call_next(request)
    http_requests_total.labels(
        tool=TOOL_NAME,
        endpoint=endpoint,
        method=method,
        status=str(response.status_code),
    ).inc()
    return response
