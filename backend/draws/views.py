# draws/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.shortcuts import get_object_or_404
from django.utils import timezone

from .models import MonthlyDraw, UserDrawEntry, DrawResult
from .serializers import (
    MonthlyDrawListSerializer,
    MonthlyDrawDetailSerializer,
    DrawResultSerializer,
    EntrySubmitSerializer,
)


# ── Public / User ──────────────────────────────────────────────────────────────

class DrawListView(APIView):
    """GET /api/draws/  — List all published draws (users) or all draws (admin)."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.is_staff:
            draws = MonthlyDraw.objects.all()
        else:
            draws = MonthlyDraw.objects.filter(status='published')
        return Response(MonthlyDrawListSerializer(draws, many=True, context={'request': request}).data)


class DrawDetailView(APIView):
    """GET /api/draws/<draw_id>/  — Draw detail + user's own entry & result."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, draw_id):
        draw = get_object_or_404(MonthlyDraw, pk=draw_id)
        if not request.user.is_staff and draw.status != 'published':
            return Response({'error': 'Draw not yet published.'}, status=status.HTTP_403_FORBIDDEN)
        return Response(MonthlyDrawDetailSerializer(draw, context={'request': request}).data)


class DrawLatestView(APIView):
    """GET /api/draws/latest/  — Most recent pending or published draw."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        draw = MonthlyDraw.objects.filter(status__in=['pending', 'published']).first()
        if not draw:
            return Response({'detail': 'No active draw.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(MonthlyDrawDetailSerializer(draw, context={'request': request}).data)


class MyDrawResultsView(APIView):
    """GET /api/draws/my-results/  — All of the logged-in user's draw results."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        results = DrawResult.objects.filter(
            user=request.user, draw__status='published'
        ).select_related('draw').order_by('-draw__year', '-draw__month')

        data = []
        for r in results:
            data.append({
                'result_id':     str(r.id),
                'draw_id':       str(r.draw.id),
                'month':         r.draw.month,
                'year':          r.draw.year,
                'drawn_numbers': r.draw.drawn_numbers,
                'my_numbers':    r.entry.numbers,
                'matched':       r.matched_numbers,
                'match_count':   r.match_count,
                'prize_tier':    r.prize_tier,
                'prize_amount':  str(r.prize_amount),
                'published_at':  r.draw.published_at,
                'verification_status': r.verification_status,
                'payment_status': r.payment_status,
            })
        return Response(data)


class DrawEntryView(APIView):
    """
    GET  /api/draws/<draw_id>/enter/  — Get user's current entry.
    POST /api/draws/<draw_id>/enter/  — Submit / update 5 numbers.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, draw_id):
        draw = get_object_or_404(MonthlyDraw, pk=draw_id, status='pending')
        try:
            entry = draw.entries.get(user=request.user)
            return Response({'numbers': entry.numbers, 'created_at': entry.created_at})
        except UserDrawEntry.DoesNotExist:
            return Response({'numbers': None})

    def post(self, request, draw_id):
        draw = get_object_or_404(MonthlyDraw, pk=draw_id)
        if draw.status != 'pending':
            return Response({'error': 'Entries are closed for this draw.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = EntrySubmitSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        numbers = serializer.validated_data['numbers']
        entry, created = UserDrawEntry.objects.update_or_create(
            user=request.user, draw=draw,
            defaults={'numbers': numbers}
        )
        return Response({
            'message': 'Entry submitted!' if created else 'Entry updated!',
            'numbers': entry.numbers,
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


# ── Admin ──────────────────────────────────────────────────────────────────────

class AdminDrawCreateView(APIView):
    """POST /api/draws/admin/create/  — Create a new monthly draw."""
    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        month      = request.data.get('month')
        year       = request.data.get('year')
        draw_mode  = request.data.get('draw_mode', 'random')
        jackpot    = request.data.get('jackpot_amount', 50000)
        notes      = request.data.get('notes', '')
        rollover_id = request.data.get('rollover_from')  # optional UUID of previous draw

        if not month or not year:
            return Response({'error': 'month and year are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if MonthlyDraw.objects.filter(month=month, year=year).exists():
            return Response({'error': f'Draw for {month}/{year} already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        rollover_from = None
        if rollover_id:
            try:
                prev = MonthlyDraw.objects.get(pk=rollover_id, jackpot_rolled_over=True)
                rollover_from = prev
            except MonthlyDraw.DoesNotExist:
                pass

        draw = MonthlyDraw.objects.create(
            month          = month,
            year           = year,
            draw_mode      = draw_mode,
            notes          = notes,
            rollover_from  = rollover_from,
            created_by     = request.user,
        )
        return Response(MonthlyDrawDetailSerializer(draw, context={'request': request}).data,
                        status=status.HTTP_201_CREATED)


class AdminDrawRunView(APIView):
    """
    POST /api/draws/admin/<draw_id>/run/
    Body: { simulate: true/false }
    Runs the draw and computes all results.
    """
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, draw_id):
        draw     = get_object_or_404(MonthlyDraw, pk=draw_id)
        simulate = bool(request.data.get('simulate', True))

        if draw.status == 'published':
            return Response({'error': 'Draw is already published. Cannot re-run.'}, status=status.HTTP_400_BAD_REQUEST)

        drawn = draw.run(simulate=simulate)
        return Response({
            'message':       'Simulation complete.' if simulate else 'Draw published!',
            'drawn_numbers': drawn,
            'status':        draw.status,
            'draw':          MonthlyDrawDetailSerializer(draw, context={'request': request}).data,
        })


class AdminDrawPublishView(APIView):
    """
    POST /api/draws/admin/<draw_id>/publish/
    Officially publishes a simulated draw (without re-running the number generator).
    """
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, draw_id):
        draw = get_object_or_404(MonthlyDraw, pk=draw_id)
        if draw.status == 'published':
            return Response({'error': 'Already published.'}, status=status.HTTP_400_BAD_REQUEST)
        if not draw.drawn_numbers:
            return Response({'error': 'Run the draw first before publishing.'}, status=status.HTTP_400_BAD_REQUEST)

        draw.status       = 'published'
        draw.published_at = timezone.now()
        draw.save(update_fields=['status', 'published_at'])

        # If results haven't been computed yet (straight to publish), compute now
        if not draw.results.exists():
            draw._compute_results = lambda d, s: None  # no-op guard
            draw.run(simulate=False)

        return Response(MonthlyDrawDetailSerializer(draw, context={'request': request}).data)


class AdminDrawDetailView(APIView):
    """GET /api/draws/admin/<draw_id>/  — Full draw detail including all results."""
    permission_classes = [permissions.IsAdminUser]

    def get(self, request, draw_id):
        draw = get_object_or_404(MonthlyDraw, pk=draw_id)
        return Response(MonthlyDrawDetailSerializer(draw, context={'request': request}).data)

    def patch(self, request, draw_id):
        """Update notes, draw_mode or jackpot_amount (only while pending)."""
        draw = get_object_or_404(MonthlyDraw, pk=draw_id)
        if draw.status == 'published':
            return Response({'error': 'Cannot edit a published draw.'}, status=status.HTTP_400_BAD_REQUEST)
        for field in ['notes', 'draw_mode', 'jackpot_amount']:
            if field in request.data:
                setattr(draw, field, request.data[field])
        draw.save()
        return Response(MonthlyDrawDetailSerializer(draw, context={'request': request}).data)


class AdminDrawResultsView(APIView):
    """GET /api/draws/admin/<draw_id>/results/  — Full result list for a draw."""
    permission_classes = [permissions.IsAdminUser]

    def get(self, request, draw_id):
        draw    = get_object_or_404(MonthlyDraw, pk=draw_id)
        results = draw.results.select_related('user', 'entry').order_by('-match_count')
        return Response(DrawResultSerializer(results, many=True).data)


class AdminDrawCalculatePoolView(APIView):
    """POST /api/draws/admin/<draw_id>/pool/  — Calculate prize pool for a draw."""
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, draw_id):
        draw = get_object_or_404(MonthlyDraw, pk=draw_id)
        if draw.status == 'published':
            return Response({'error': 'Draw is already published.'}, status=status.HTTP_400_BAD_REQUEST)
        
        total = draw.calculate_pool(save=True)
        return Response({
            'message': f'Pool calculated: ₹{total:,.0f} total.',
            'draw': MonthlyDrawDetailSerializer(draw, context={'request': request}).data
        })


class DrawProofUploadView(APIView):
    """POST /api/draws/results/<result_id>/upload-proof/  — Winner uploads score screenshot."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, result_id):
        result = get_object_or_404(DrawResult, pk=result_id, user=request.user)
        if result.prize_tier == 'none':
            return Response({'error': 'No prize won. Proof not required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        proof_image = request.FILES.get('proof_image')
        if not proof_image:
            return Response({'error': 'Please provide a proof_image file.'}, status=status.HTTP_400_BAD_REQUEST)
        
        result.proof_image = proof_image
        result.verification_status = 'submitted'
        result.save()
        return Response(DrawResultSerializer(result).data)


class AdminDrawResultReviewView(APIView):
    """PATCH /api/draws/admin/results/<result_id>/review/  — Admin approves/rejects proof, sets payment state."""
    permission_classes = [permissions.IsAdminUser]

    def patch(self, request, result_id):
        result = get_object_or_404(DrawResult, pk=result_id)
        
        for field in ['verification_status', 'payment_status', 'admin_notes']:
            if field in request.data:
                setattr(result, field, request.data[field])
        
        result.save()
        return Response(DrawResultSerializer(result).data)


class AdminAllWinnersView(APIView):
    """GET /api/draws/admin/winners/  — List all winning results across all draws."""
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        winners = DrawResult.objects.exclude(prize_tier='none').select_related('user', 'draw', 'entry').order_by('-draw__year', '-draw__month', '-match_count')
        return Response(DrawResultSerializer(winners, many=True).data)
