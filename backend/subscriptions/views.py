import razorpay
import hmac
import hashlib

from django.conf import settings
from django.utils import timezone
from datetime import timedelta

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from .models import Subscription
from .serializers import SubscriptionSerializer

# Razorpay client (initialised once)
rzp_client = razorpay.Client(
    auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
)

PLANS = settings.SUBSCRIPTION_PLANS   # {'monthly': {...}, 'yearly': {...}}


# ── 1. Create Razorpay Order ─────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_order(request):
    """
    POST /api/subscriptions/create-order/
    Body: { "plan": "monthly" | "yearly" }

    Returns: Razorpay order_id + key_id for the frontend checkout.
    """
    plan = request.data.get('plan')
    if plan not in PLANS:
        return Response({'error': "Plan must be 'monthly' or 'yearly'."}, status=400)

    plan_info = PLANS[plan]
    amount_paise = plan_info['price_inr'] * 100   # Razorpay uses paise

    try:
        order = rzp_client.order.create({
            'amount':   amount_paise,
            'currency': 'INR',
            'receipt':  f"user_{request.user.id}_{plan}",
            'notes': {
                'user_id': str(request.user.id),
                'plan':    plan,
            },
        })
    except Exception as e:
        return Response({'error': f'Failed to create order: {str(e)}'}, status=500)

    return Response({
        'order_id':  order['id'],
        'amount':    amount_paise,
        'currency':  'INR',
        'key_id':    settings.RAZORPAY_KEY_ID,
        'plan':      plan,
        'plan_label': plan_info['label'],
        'name':      'FullStack App',
        'description': f"{plan_info['label']} Subscription — ₹{plan_info['price_inr']:,}",
    })


# ── 2. Verify Payment & Activate Subscription ────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_payment(request):
    """
    POST /api/subscriptions/verify-payment/
    Body: {
        "razorpay_order_id":   "order_xxx",
        "razorpay_payment_id": "pay_xxx",
        "razorpay_signature":  "...",
        "plan":                "monthly" | "yearly"
    }

    Verifies HMAC-SHA256 signature and activates the subscription.
    """
    order_id   = request.data.get('razorpay_order_id', '')
    payment_id = request.data.get('razorpay_payment_id', '')
    signature  = request.data.get('razorpay_signature', '')
    plan       = request.data.get('plan', '')

    if not all([order_id, payment_id, signature, plan]):
        return Response({'error': 'Missing payment details.'}, status=400)

    if plan not in PLANS:
        return Response({'error': 'Invalid plan.'}, status=400)

    # Verify signature
    expected = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode(),
        f"{order_id}|{payment_id}".encode(),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected, signature):
        return Response({'error': 'Payment verification failed. Invalid signature.'}, status=400)

    # Activate subscription
    days = PLANS[plan]['days']
    Subscription.objects.filter(user=request.user).delete()   # clear old
    Subscription.objects.create(
        user=request.user,
        plan=plan,
        end_date=timezone.now() + timedelta(days=days),
        is_active=True,
    )

    return Response({
        'message': f"{PLANS[plan]['label']} subscription activated successfully! 🎉",
        'plan': plan,
        'days': days,
    }, status=201)


# ── 3. Get Current Subscription ──────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_subscription(request):
    """GET /api/subscriptions/me/"""
    try:
        sub = Subscription.objects.get(user=request.user, is_active=True)
    except Subscription.DoesNotExist:
        return Response({'status': 'no_subscription', 'message': 'No active subscription.'}, status=404)
    return Response(SubscriptionSerializer(sub).data)


# ── 4. Cancel Subscription ───────────────────────────────────────────────────

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def cancel_subscription(request):
    """DELETE /api/subscriptions/cancel/"""
    updated = Subscription.objects.filter(user=request.user, is_active=True).update(is_active=False)
    if updated:
        return Response({'message': 'Subscription cancelled.'})
    return Response({'message': 'No active subscription to cancel.'}, status=404)


# ── 5. Plan Info (public) ────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([AllowAny])
def plan_info(request):
    """GET /api/subscriptions/plans/  — Public endpoint listing plan details."""
    return Response(PLANS)
