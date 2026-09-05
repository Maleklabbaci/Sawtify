import hmac
import hashlib
from typing import Optional
from fastapi import APIRouter, Header, Request, HTTPException, status
from pydantic import BaseModel
from config import get_settings
from services.supabase_service import credit_balance_from_payment

router = APIRouter(prefix="/api/webhooks", tags=["Webhooks"])
settings = get_settings()

class PaymentWebhookPayload(BaseModel):
    event: str  # e.g., "payment.succeeded"
    transaction_id: str
    user_id: str
    pack_id: str
    amount_dzd: float
    points_to_credit: int
    gateway: str  # "edahabia", "cib", "slickpay"
    timestamp: int

@router.post("/payment")
async def handle_payment_webhook(
    request: Request,
    x_signature: Optional[str] = Header(None, alias="X-Signature-SHA256")
):
    """
    Secure Webhook endpoint for Algerian payment gateways (SlickPay / SATIM / Edahabia).
    Validates HMAC-SHA256 payload signature to prevent tampering,
    and credits points to user balance via atomic stored procedure.
    """
    raw_body = await request.body()

    # 1. Verify HMAC-SHA256 Signature
    if settings.ENVIRONMENT == "production":
        if not x_signature:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Signature header manquante."
            )
        
        expected_sig = hmac.new(
            settings.WEBHOOK_SECRET_KEY.encode(),
            raw_body,
            hashlib.sha256
        ).hexdigest()

        if not hmac.compare_digest(expected_sig, x_signature):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Signature HMAC invalide. Requête rejetée."
            )

    # 2. Parse payload
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payload JSON invalide."
        )

    event_type = data.get("event")
    if event_type not in ["payment.succeeded", "charge.completed"]:
        return {"status": "ignored", "reason": f"Unhandled event type: {event_type}"}

    user_id = data.get("user_id")
    pack_id = data.get("pack_id", "pack_pro")
    transaction_id = data.get("transaction_id")
    gateway = data.get("gateway", "edahabia")
    amount_dzd = float(data.get("amount_dzd", 1000.0))
    points = int(data.get("points_to_credit", 220))

    if not user_id or not transaction_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Champs user_id ou transaction_id manquants."
        )

    # 3. Credit points atomically via idempotent database function
    result = await credit_balance_from_payment(
        user_id=user_id,
        pack_id=pack_id,
        gateway=gateway,
        gateway_reference=transaction_id,
        amount_dzd=amount_dzd,
        points=points,
        payload=data
    )

    return {
        "status": "success",
        "message": f"{points} points crédités avec succès au compte {user_id}",
        "transaction_id": transaction_id,
        "new_balance": result.get("new_balance")
    }
