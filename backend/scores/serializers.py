from rest_framework import serializers
from .models import Score


class ScoreSerializer(serializers.ModelSerializer):
    # Read-only fields shown in responses
    username   = serializers.CharField(source='user.username', read_only=True)
    user_email = serializers.EmailField(source='user.email',   read_only=True)

    class Meta:
        model  = Score
        fields = [
            'id',
            'username',    # from user FK — read only
            'user_email',  # from user FK — read only
            'score',
            'date',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'username', 'user_email']

    def validate_score(self, value):
        if value < 0:
            raise serializers.ValidationError("Score cannot be negative.")
        return value
