from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model

from .serializers import RegisterSerializer, LoginSerializer, UserSerializer

User = get_user_model()


from rest_framework.decorators import api_view, permission_classes as set_permissions

@api_view(['GET'])
@set_permissions([permissions.AllowAny])   # ← no JWT needed, open for testing
def test_users(request):
    """GET /api/users/users/  — Public test view: list all users."""
    users = User.objects.all()
    return Response(UserSerializer(users, many=True).data)



def get_tokens_for_user(user):
    """Generate JWT access and refresh tokens for a user."""
    refresh = RefreshToken.for_user(user)
    refresh['role'] = user.role  # embed role in token payload
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


# ─── User Registration ───────────────────────────────────────────────────────

class UserRegisterView(APIView):
    """POST /api/users/register/  — Register a new regular user."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        data = request.data.copy()
        data['role'] = 'user'  # force role to 'user'
        serializer = RegisterSerializer(data=data)
        if serializer.is_valid():
            user   = serializer.save()
            tokens = get_tokens_for_user(user)
            return Response({
                'message': 'Registration successful.',
                'user': UserSerializer(user).data,
                'tokens': tokens,
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ─── User Login ──────────────────────────────────────────────────────────────

class UserLoginView(APIView):
    """POST /api/users/login/  — Login as a regular user."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            if user.role != 'user':
                return Response(
                    {'error': 'This endpoint is for regular users only.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            tokens = get_tokens_for_user(user)
            return Response({
                'message': 'Login successful.',
                'user': UserSerializer(user).data,
                'tokens': tokens,
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ─── Admin Login ─────────────────────────────────────────────────────────────

class AdminLoginView(APIView):
    """POST /api/users/admin/login/  — Login as an admin."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            if user.role != 'admin':
                return Response(
                    {'error': 'Access denied. Admins only.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            tokens = get_tokens_for_user(user)
            return Response({
                'message': 'Admin login successful.',
                'user': UserSerializer(user).data,
                'tokens': tokens,
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ─── Admin Register ───────────────────────────────────────────────────────────

class AdminRegisterView(APIView):
    """POST /api/users/admin/register/  — Register a new admin (requires existing admin token)."""
    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        data = request.data.copy()
        data['role'] = 'admin'
        serializer = RegisterSerializer(data=data)
        if serializer.is_valid():
            user = serializer.save()
            user.is_staff = True
            user.save()
            return Response({
                'message': 'Admin registered successfully.',
                'user': UserSerializer(user).data,
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ─── Profile (Protected) ─────────────────────────────────────────────────────

class ProfileView(APIView):
    """GET /api/users/profile/  — Get logged-in user's profile."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


# ─── Admin: List All Users ───────────────────────────────────────────────────

class UserListView(APIView):
    """GET /api/users/admin/users/  — List all users (admin only)."""
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        users = User.objects.all().order_by('-created_at')
        return Response(UserSerializer(users, many=True).data)
