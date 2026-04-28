# charities/urls.py
from django.urls import path
from .views import (
    CharityListView, CharityDetailView,
    MyCharityView,
    AdminCharityListCreateView, AdminCharityDetailView,
    AdminEventListCreateView, AdminEventDetailView,
    AdminEventPhotoUploadView, AdminEventPhotoDeleteView,
)

urlpatterns = [
    # ── Public ───────────────────────────────────────────────────────────────
    path('', CharityListView.as_view(), name='charity-list'),
    path('<slug:slug>/', CharityDetailView.as_view(), name='charity-detail'),

    # ── Authenticated user ────────────────────────────────────────────────────
    path('my-charity/', MyCharityView.as_view(), name='my-charity'),

    # ── Admin: Charity management ─────────────────────────────────────────────
    path('admin/charities/', AdminCharityListCreateView.as_view(), name='admin-charity-list'),
    path('admin/charities/<slug:slug>/', AdminCharityDetailView.as_view(), name='admin-charity-detail'),

    # ── Admin: Event management ───────────────────────────────────────────────
    path('admin/charities/<slug:slug>/events/', AdminEventListCreateView.as_view(), name='admin-event-list'),
    path('admin/events/<uuid:event_id>/', AdminEventDetailView.as_view(), name='admin-event-detail'),

    # ── Admin: Photo management ───────────────────────────────────────────────
    path('admin/events/<uuid:event_id>/photos/', AdminEventPhotoUploadView.as_view(), name='admin-event-photos'),
    path('admin/photos/<uuid:photo_id>/', AdminEventPhotoDeleteView.as_view(), name='admin-photo-delete'),
]