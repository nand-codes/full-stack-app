# draws/urls.py
from django.urls import path
from .views import (
    DrawListView, DrawDetailView, DrawLatestView,
    DrawEntryView, MyDrawResultsView,
    AdminDrawCreateView, AdminDrawRunView,
    AdminDrawPublishView, AdminDrawDetailView,
    AdminDrawResultsView, AdminDrawCalculatePoolView,
    DrawProofUploadView, AdminDrawResultReviewView,
    AdminAllWinnersView,
)

urlpatterns = [
    # ── User / Public ─────────────────────────────────────────────────────────
    path('',                                  DrawListView.as_view(),      name='draw-list'),
    path('latest/',                           DrawLatestView.as_view(),    name='draw-latest'),
    path('my-results/',                       MyDrawResultsView.as_view(), name='draw-my-results'),
    path('<uuid:draw_id>/',                   DrawDetailView.as_view(),    name='draw-detail'),
    path('<uuid:draw_id>/enter/',             DrawEntryView.as_view(),     name='draw-enter'),
    path('results/<uuid:result_id>/upload-proof/', DrawProofUploadView.as_view(), name='draw-upload-proof'),

    # ── Admin ─────────────────────────────────────────────────────────────────
    path('admin/create/',                     AdminDrawCreateView.as_view(),       name='admin-draw-create'),
    path('admin/<uuid:draw_id>/',             AdminDrawDetailView.as_view(),       name='admin-draw-detail'),
    path('admin/<uuid:draw_id>/run/',         AdminDrawRunView.as_view(),          name='admin-draw-run'),
    path('admin/<uuid:draw_id>/publish/',     AdminDrawPublishView.as_view(),      name='admin-draw-publish'),
    path('admin/<uuid:draw_id>/results/',     AdminDrawResultsView.as_view(),      name='admin-draw-results'),
    path('admin/<uuid:draw_id>/pool/',        AdminDrawCalculatePoolView.as_view(), name='admin-draw-pool'),
    path('admin/results/<uuid:result_id>/review/', AdminDrawResultReviewView.as_view(), name='admin-draw-result-review'),
    path('admin/winners/',                    AdminAllWinnersView.as_view(),       name='admin-draw-all-winners'),
]
