from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from subscriptions.permissions import IsSubscribed
from .models import Score
from .serializers import ScoreSerializer


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsSubscribed])
def add_score(request):
    """
    POST /api/scores/add/
    Only accessible to authenticated users with an active subscription.
    """
    serializer = ScoreSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(user=request.user)
        return Response({"message": "Score recorded successfully"}, status=201)
    return Response(serializer.errors, status=400)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsSubscribed])
def my_scores(request):
    """
    GET /api/scores/my-scores/
    Only accessible to authenticated users with an active subscription.
    """
    scores = Score.objects.filter(user=request.user).order_by('-date')[:5]
    return Response(ScoreSerializer(scores, many=True).data)
