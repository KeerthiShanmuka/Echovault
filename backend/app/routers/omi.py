from typing import Any, Dict, Optional
from fastapi import APIRouter, Header, HTTPException, Query, Request

from app.services.omi_service import omi_service

router = APIRouter(prefix="/omi", tags=["Omi Webhooks"])


@router.post("")
@router.post("/webhook")
@router.post("/conversation")
async def receive_omi_conversation(
    request: Request,
    uid: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
    x_omi_secret: Optional[str] = Header(None)
):
    token = x_omi_secret or (authorization.replace("Bearer ", "").strip() if authorization else None)
    if not omi_service.verify_auth(token):
        raise HTTPException(status_code=401, detail="Unauthorized Omi webhook token.")

    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload.")

    res = await omi_service.handle_conversation_webhook(payload, uid=uid)
    return res


@router.post("/realtime")
async def receive_omi_realtime(
    request: Request,
    session_id: Optional[str] = Query(None),
    uid: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
    x_omi_secret: Optional[str] = Header(None)
):
    token = x_omi_secret or (authorization.replace("Bearer ", "").strip() if authorization else None)
    if not omi_service.verify_auth(token):
        raise HTTPException(status_code=401, detail="Unauthorized Omi webhook token.")

    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload.")

    res = await omi_service.handle_realtime_webhook(payload, session_id=session_id, uid=uid)
    return res
