from rest_framework.permissions import BasePermission
from django.utils import timezone


class IsSubscribed(BasePermission):
    """
    Allows access only to users with an active, non-expired subscription.
    """
    message = "An active subscription is required to access this feature."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        try:
            sub = request.user.subscription   # OneToOne related_name
            return sub.is_active and sub.end_date > timezone.now()
        except Exception:
            return False
