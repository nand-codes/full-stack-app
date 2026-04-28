from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    UserRegisterView,
    UserLoginView,
    AdminLoginView,
    AdminRegisterView,
    ProfileView,
    UserListView,
    AdminUserDetailView,
    AdminAnalyticsView,
    test_users,
)

urlpatterns = [
    # ── User Auth ──────────────────────────────────────────
    path('register/',          UserRegisterView.as_view(),  name='user-register'),
    path('login/',             UserLoginView.as_view(),     name='user-login'),
    path('users/',             UserListView.as_view(),      name='user-list'),
    path('test-users/',        test_users,                  name='test-users'),   # ← public, no JWT

    # ── Admin Auth ─────────────────────────────────────────
    path('admin/register/',    AdminRegisterView.as_view(), name='admin-register'),
    path('admin/login/',       AdminLoginView.as_view(),    name='admin-login'),

    # ── Protected Routes ───────────────────────────────────
    path('profile/',           ProfileView.as_view(),       name='user-profile'),
    path('admin/users/',       UserListView.as_view(),      name='user-list'),
    path('admin/users/<int:pk>/', AdminUserDetailView.as_view(), name='admin-user-detail'),
    path('admin/analytics/',   AdminAnalyticsView.as_view(), name='admin-analytics'),

    # ── JWT Token Refresh ──────────────────────────────────
    path('token/refresh/',     TokenRefreshView.as_view(),  name='token-refresh'),
]
