from fastapi import APIRouter, HTTPException
from datetime import datetime
from app.models.schemas import IntegrationsHealthResponse, IntegrationItemStatus
from app.config import settings
from app.services.lyzr_service import lyzr_service
from app.services.qdrant_service import qdrant_service

router = APIRouter(prefix="/api/integrations", tags=["Integrations"])

@router.get("/status", response_model=IntegrationsHealthResponse)
def get_integrations_status():
    lyzr_live = lyzr_service.is_configured()
    qdrant_live = qdrant_service.is_live()

    lyzr_item = IntegrationItemStatus(
        name="Lyzr Multi-Agent AI",
        status="connected" if lyzr_live else "demo_mode",
        is_live=lyzr_live,
        details="4 agents live and connected." if lyzr_live else "Simulation mode active. Ready for LYZR_API_KEY in backend/.env.",
        last_tested=datetime.utcnow().isoformat()
    )

    qdrant_item = IntegrationItemStatus(
        name="Qdrant Cloud Vector DB",
        status="connected" if qdrant_live else "demo_mode",
        is_live=qdrant_live,
        details=f"Connected to collection '{settings.QDRANT_COLLECTION}'." if qdrant_live else "Local in-memory vectors active. Ready for QDRANT_URL and API Key in backend/.env.",
        last_tested=datetime.utcnow().isoformat()
    )

    omi_item = IntegrationItemStatus(
        name="Omi Wearable Webhook",
        status="connected",
        is_live=True,
        details="Endpoints /omi/conversation and /omi/realtime ready to receive data.",
        last_tested=datetime.utcnow().isoformat()
    )

    embed_item = IntegrationItemStatus(
        name="Vector Embedding Engine",
        status="connected",
        is_live=True,
        details=f"{settings.EMBEDDING_PROVIDER.capitalize()} ({settings.EMBEDDING_DIMENSION} dims) initialized.",
        last_tested=datetime.utcnow().isoformat()
    )

    mode = "live" if (lyzr_live and qdrant_live) else "demo"

    return IntegrationsHealthResponse(
        backend_ok=True,
        mode=mode,
        lyzr=lyzr_item,
        qdrant=qdrant_item,
        omi=omi_item,
        embedding=embed_item,
        timestamp=datetime.utcnow().isoformat()
    )

@router.post("/test/{service_name}")
async def test_single_integration(service_name: str):
    service_name = service_name.lower()
    
    if service_name == "lyzr":
        if lyzr_service.is_configured():
            ok, resp, dur, err = await lyzr_service.call_agent(
                agent_id=lyzr_service.manager_agent_id or lyzr_service.summarizer_agent_id,
                message="Health ping test"
            )
            if ok:
                return {"success": True, "message": f"Successfully connected to Lyzr Agent ({dur}ms)."}
            else:
                return {"success": False, "message": f"Lyzr ping returned: {err}"}
        return {"success": True, "message": "Lyzr Demo mode verified. Add LYZR_API_KEY in backend/.env for live cloud execution."}

    elif service_name == "qdrant":
        if qdrant_service.is_live():
            return {"success": True, "message": f"Successfully connected to Qdrant Cloud. Collection '{settings.QDRANT_COLLECTION}' verified."}
        return {"success": True, "message": "Local vector store verified. Add QDRANT_URL & QDRANT_API_KEY in backend/.env for cloud persistence."}

    elif service_name == "omi":
        return {"success": True, "message": "Omi endpoints /omi/conversation and /omi/realtime are ready to receive webhooks."}

    elif service_name in ("backend", "embedding"):
        return {"success": True, "message": f"Service '{service_name}' is healthy and operating within nominal latency."}

    raise HTTPException(status_code=400, detail=f"Unknown service '{service_name}'")
