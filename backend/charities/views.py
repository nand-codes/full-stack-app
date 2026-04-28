# charities/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.shortcuts import get_object_or_404

from .models import Charity, CharityEvent, CharityEventPhoto, UserCharity
from .serializers import (
    CharitySerializer, CharityEventSerializer,
    CharityEventPhotoSerializer, UserCharitySerializer,
)


# ── Public ─────────────────────────────────────────────────────────────────────

class CharityListView(APIView):
    """GET /api/charities/  — List all active charities (with events & photos)."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        charities = Charity.objects.filter(is_active=True)
        return Response(
            CharitySerializer(charities, many=True, context={'request': request}).data
        )


class CharityDetailView(APIView):
    """GET /api/charities/<slug>/  — Single charity detail."""
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        charity = get_object_or_404(Charity, slug=slug, is_active=True)
        return Response(CharitySerializer(charity, context={'request': request}).data)


# ── User: select charity ───────────────────────────────────────────────────────

class MyCharityView(APIView):
    """
    GET  /api/charities/my-charity/  — Get the logged-in user's charity selection.
    POST /api/charities/my-charity/  — Set / update charity selection.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            selection = request.user.charity_selection
            return Response(
                UserCharitySerializer(selection, context={'request': request}).data
            )
        except UserCharity.DoesNotExist:
            return Response({'charity': None, 'contribution_percentage': 10.0})

    def post(self, request):
        charity_id  = request.data.get('charity_id')
        percentage  = float(request.data.get('contribution_percentage', 10))

        if not charity_id:
            return Response({'error': 'charity_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if percentage < 10:
            return Response({'error': 'Minimum contribution is 10%.'}, status=status.HTTP_400_BAD_REQUEST)

        charity = get_object_or_404(Charity, pk=charity_id, is_active=True)
        selection, _ = UserCharity.objects.get_or_create(user=request.user)
        selection.charity = charity
        selection.contribution_percentage = percentage
        selection.save()

        return Response(
            UserCharitySerializer(selection, context={'request': request}).data,
            status=status.HTTP_200_OK,
        )


# ── Admin: Charity CRUD ────────────────────────────────────────────────────────

class AdminCharityListCreateView(APIView):
    """
    GET  /api/charities/admin/charities/  — List all charities.
    POST /api/charities/admin/charities/  — Create a new charity.
    """
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        charities = Charity.objects.all()
        return Response(
            CharitySerializer(charities, many=True, context={'request': request}).data
        )

    def post(self, request):
        serializer = CharitySerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminCharityDetailView(APIView):
    """
    GET    /api/charities/admin/charities/<slug>/  — Get charity.
    PUT    /api/charities/admin/charities/<slug>/  — Edit charity (partial).
    DELETE /api/charities/admin/charities/<slug>/  — Delete charity.
    """
    permission_classes = [permissions.IsAdminUser]

    def get_object(self, slug):
        return get_object_or_404(Charity, slug=slug)

    def get(self, request, slug):
        return Response(
            CharitySerializer(self.get_object(slug), context={'request': request}).data
        )

    def put(self, request, slug):
        serializer = CharitySerializer(
            self.get_object(slug), data=request.data,
            partial=True, context={'request': request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, slug):
        self.get_object(slug).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Admin: Event CRUD ──────────────────────────────────────────────────────────

class AdminEventListCreateView(APIView):
    """
    GET  /api/charities/admin/charities/<slug>/events/  — List events for a charity.
    POST /api/charities/admin/charities/<slug>/events/  — Create event.
    """
    permission_classes = [permissions.IsAdminUser]

    def get(self, request, slug):
        charity = get_object_or_404(Charity, slug=slug)
        return Response(
            CharityEventSerializer(
                charity.events.all(), many=True, context={'request': request}
            ).data
        )

    def post(self, request, slug):
        charity    = get_object_or_404(Charity, slug=slug)
        serializer = CharityEventSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save(charity=charity)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminEventDetailView(APIView):
    """
    GET    /api/charities/admin/events/<event_id>/  — Get event.
    PUT    /api/charities/admin/events/<event_id>/  — Edit event (partial).
    DELETE /api/charities/admin/events/<event_id>/  — Delete event.
    """
    permission_classes = [permissions.IsAdminUser]

    def get_object(self, event_id):
        return get_object_or_404(CharityEvent, pk=event_id)

    def get(self, request, event_id):
        return Response(
            CharityEventSerializer(self.get_object(event_id), context={'request': request}).data
        )

    def put(self, request, event_id):
        serializer = CharityEventSerializer(
            self.get_object(event_id), data=request.data,
            partial=True, context={'request': request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, event_id):
        self.get_object(event_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Admin: Event Photos ────────────────────────────────────────────────────────

class AdminEventPhotoUploadView(APIView):
    """POST /api/charities/admin/events/<event_id>/photos/  — Upload photo(s)."""
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, event_id):
        event      = get_object_or_404(CharityEvent, pk=event_id)
        serializer = CharityEventPhotoSerializer(
            data=request.data, context={'request': request}
        )
        if serializer.is_valid():
            serializer.save(event=event)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminEventPhotoDeleteView(APIView):
    """DELETE /api/charities/admin/photos/<photo_id>/  — Remove a photo."""
    permission_classes = [permissions.IsAdminUser]

    def delete(self, request, photo_id):
        photo = get_object_or_404(CharityEventPhoto, pk=photo_id)
        photo.image.delete(save=False)   # remove file from disk
        photo.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)