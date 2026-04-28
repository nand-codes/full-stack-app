# charities/serializers.py
from rest_framework import serializers
from .models import Charity, CharityEvent, CharityEventPhoto, UserCharity


class CharityEventPhotoSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(use_url=True)

    class Meta:
        model  = CharityEventPhoto
        fields = ['id', 'image', 'caption', 'uploaded_at']


class CharityEventSerializer(serializers.ModelSerializer):
    photos = CharityEventPhotoSerializer(many=True, read_only=True)

    class Meta:
        model  = CharityEvent
        fields = [
            'id', 'title', 'description', 'event_date',
            'location', 'is_published', 'photos', 'created_at',
        ]


class CharitySerializer(serializers.ModelSerializer):
    events = CharityEventSerializer(many=True, read_only=True)
    image  = serializers.ImageField(use_url=True, required=False)

    class Meta:
        model  = Charity
        fields = [
            'id', 'name', 'slug', 'description', 'short_description',
            'image', 'website_url', 'is_featured', 'is_active',
            'events', 'created_at',
        ]


class UserCharitySerializer(serializers.ModelSerializer):
    charity    = CharitySerializer(read_only=True)
    charity_id = serializers.UUIDField(write_only=True)

    class Meta:
        model  = UserCharity
        fields = ['charity', 'charity_id', 'contribution_percentage', 'updated_at']
