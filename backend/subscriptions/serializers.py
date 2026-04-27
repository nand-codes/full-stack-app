from rest_framework import serializers
from .models import Subscription


class SubscriptionSerializer(serializers.ModelSerializer):
    username   = serializers.CharField(source='user.username', read_only=True)
    days_left  = serializers.SerializerMethodField()

    class Meta:
        model  = Subscription
        fields = ['id', 'username', 'plan', 'start_date', 'end_date', 'is_active', 'days_left']
        read_only_fields = ['id', 'username', 'start_date', 'end_date', 'is_active', 'days_left']

    def get_days_left(self, obj):
        from django.utils import timezone
        if not obj.is_active:
            return 0
        delta = obj.end_date - timezone.now()
        return max(delta.days, 0)

    def validate_plan(self, value):
        if value not in ('monthly', 'yearly'):
            raise serializers.ValidationError("Plan must be 'monthly' or 'yearly'.")
        return value
