from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(
    title="groove-ai Engine",
    version="0.1.0",
    description="AI + Parsing engine for groove-ai",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ────────────────────────────────────────────────────────────────────
from app.api.routes import ingest, parse, embed, graph, ai, metrics, chat, insights, functions, code  # noqa: E402

app.include_router(ingest.router, prefix="/api/ingest", tags=["Ingestion"])
app.include_router(parse.router, prefix="/api/parse", tags=["Parsing"])
app.include_router(embed.router, prefix="/api/embed", tags=["Embeddings"])
app.include_router(graph.router, prefix="/api/graph", tags=["Graph"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI"])
app.include_router(metrics.router, prefix="/api/metrics", tags=["Metrics"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(insights.router, prefix="/api/insights", tags=["Insights"])
app.include_router(functions.router, prefix="/api/functions", tags=["Functions"])
app.include_router(code.router, prefix="/api/code", tags=["Code Recovery"])


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok"}
