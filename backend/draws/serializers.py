# draws/serializers.py
import calendar
from rest_framework import serializers
from .models import MonthlyDraw, UserDrawEntry, DrawResult


class DrawResultSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model  = DrawResult
        fields = [
            'id', 'username', 'matched_numbers', 'match_count', 'prize_tier', 'prize_amount',
            'verification_status', 'payment_status', 'proof_image', 'admin_notes',
        ]


class UserDrawEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model  = UserDrawEntry
        fields = ['id', 'numbers', 'created_at', 'updated_at']


class MonthlyDrawListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""
    month_name         = serializers.SerializerMethodField()
    entry_count        = serializers.SerializerMethodField()
    winner_count       = serializers.SerializerMethodField()
    effective_jackpot  = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model  = MonthlyDraw
        fields = [
            'id', 'month', 'year', 'month_name', 'draw_mode', 'drawn_numbers',
            'status', 'jackpot_rolled_over', 'rollover_jackpot',
            # Prize pool
            'pool_total', 'pool_5match', 'pool_4match', 'pool_3match', 'effective_jackpot',
            'entry_count', 'winner_count', 'published_at', 'notes',
        ]

    def get_month_name(self, obj):
        return calendar.month_name[obj.month]

    def get_entry_count(self, obj):
        return obj.entries.count()

    def get_winner_count(self, obj):
        return obj.results.exclude(prize_tier='none').count()


class MonthlyDrawDetailSerializer(MonthlyDrawListSerializer):
    """Full serializer including results (admin) or user's own result."""
    results = serializers.SerializerMethodField()
    my_entry  = serializers.SerializerMethodField()
    my_result = serializers.SerializerMethodField()

    class Meta(MonthlyDrawListSerializer.Meta):
        fields = MonthlyDrawListSerializer.Meta.fields + [
            'results', 'my_entry', 'my_result', 'created_at',
        ]

    def get_results(self, obj):
        request = self.context.get('request')
        # Only admins see all results; regular users get empty list here
        if request and request.user.is_staff:
            return DrawResultSerializer(obj.results.all(), many=True).data
        return []

    def get_my_entry(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        try:
            entry = obj.entries.get(user=request.user)
            return entry.numbers
        except UserDrawEntry.DoesNotExist:
            return None

    def get_my_result(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        try:
            result = obj.results.get(user=request.user)
            return DrawResultSerializer(result).data
        except DrawResult.DoesNotExist:
            return None


class EntrySubmitSerializer(serializers.Serializer):
    numbers = serializers.ListField(
        child=serializers.IntegerField(min_value=1, max_value=49),
        min_length=5, max_length=5,
    )

    def validate_numbers(self, value):
        if len(set(value)) != 5:
            raise serializers.ValidationError('All 5 numbers must be unique.')
        return sorted(value)
