from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from database import get_db
from models import User, UserRole
from routers.auth import get_current_user
from config import settings
import stripe
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/payments", tags=["Payments"])

# Initialize Stripe
if settings.STRIPE_SECRET_KEY:
    stripe.api_key = settings.STRIPE_SECRET_KEY

# Plan credits mapping
PLAN_CREDITS = {
    "PRO": 100,
    "ENTERPRISE": 500,
}

class PaymentIntentRequest(BaseModel):
    plan: str

class PaymentIntentResponse(BaseModel):
    clientSecret: str

@router.post("/create-payment-intent", response_model=PaymentIntentResponse)
async def create_payment_intent(
    request: PaymentIntentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a Stripe PaymentIntent"""
    if not settings.STRIPE_SECRET_KEY:
        logger.error("STRIPE_SECRET_KEY is not set in settings.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Stripe is not configured"
        )

    # Determine price based on plan
    amount = 0
    currency = "usd"

    if request.plan.upper() == "PRO":
        amount = 999  # $9.99 in cents
    elif request.plan.upper() == "ENTERPRISE":
        amount = 9999  # $99.99
    else:
        raise HTTPException(status_code=400, detail="Invalid plan")

    try:
        intent = stripe.PaymentIntent.create(
            amount=amount,
            currency=currency,
            metadata={
                "user_id": str(current_user.id),
                "email": current_user.email,
                "plan": request.plan.upper()
            },
            automatic_payment_methods={
                'enabled': True,
            },
        )
        return {"clientSecret": intent.client_secret}
    except Exception as e:
        logger.error(f"Stripe Error: {e}")
        raise HTTPException(status_code=400, detail="Payment processing error")

@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Handle Stripe webhook events with signature verification"""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    # Webhook signature verification is REQUIRED - reject if not configured
    if not settings.STRIPE_WEBHOOK_SECRET:
        logger.error("Webhook: STRIPE_WEBHOOK_SECRET not configured, rejecting request")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Webhook endpoint not configured"
        )

    if not sig_header:
        raise HTTPException(status_code=400, detail="Missing stripe-signature header")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        logger.error("Webhook: invalid payload")
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        logger.error("Webhook: invalid signature")
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Handle the payment_intent.succeeded event
    event_type = event.type
    if event_type == "payment_intent.succeeded":
        payment_intent = event.data.object
        metadata = payment_intent.metadata

        user_id = metadata.get("user_id")
        plan = metadata.get("plan")

        if user_id and plan:
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()

            if user:
                # Upgrade role and add credits
                if plan == "PRO":
                    user.role = UserRole.PRO
                elif plan == "ENTERPRISE":
                    user.role = UserRole.PRO  # Enterprise also gets PRO role

                credits_to_add = PLAN_CREDITS.get(plan, 0)
                user.credits += credits_to_add

                await db.commit()
                logger.info(f"Webhook: upgraded user {user_id} to {plan}, added {credits_to_add} credits")
            else:
                logger.warning(f"Webhook: user {user_id} not found")
        else:
            logger.warning("Webhook: missing user_id or plan in metadata")

    return {"status": "success"}
