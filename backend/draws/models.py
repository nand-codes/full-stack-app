# draws/models.py
import uuid
import random
import calendar
from decimal import Decimal
from collections import Counter

from django.db import models
from django.conf import settings
from django.utils import timezone


# ── Prize pool constants ───────────────────────────────────────────────────────
# Fraction of each monthly subscription that feeds the draw pool
SUBSCRIPTION_POOL_PCT = Decimal('0.10')          # 10 % of each sub goes to prize pool

# How that pool is split across tiers
TIER_SHARES = {
    '5_match': Decimal('0.40'),   # 40 % — jackpot (rolls over if unclaimed)
    '4_match': Decimal('0.35'),   # 35 %
    '3_match': Decimal('0.25'),   # 25 %
}

# Subscription plan amounts (must match settings.SUBSCRIPTION_PLANS)
PLAN_AMOUNTS = {
    'monthly': Decimal('2500'),
    'yearly':  Decimal('20000') / 12,   # monthly equivalent for fair pooling
}


class MonthlyDraw(models.Model):
    STATUS_CHOICES = [
        ('pending',   'Pending — accepting entries'),
        ('simulated', 'Simulated — preview only'),
        ('published', 'Published — official results'),
    ]
    DRAW_MODE_CHOICES = [
        ('random',      'Random (standard lottery)'),
        ('algorithmic', 'Algorithmic (score-weighted)'),
    ]

    id                  = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    month               = models.PositiveSmallIntegerField()
    year                = models.PositiveSmallIntegerField()
    draw_mode           = models.CharField(max_length=15, choices=DRAW_MODE_CHOICES, default='random')
    drawn_numbers       = models.JSONField(default=list, blank=True)
    status              = models.CharField(max_length=12, choices=STATUS_CHOICES, default='pending')

    # ── Prize pool ────────────────────────────────────────────────────────────
    # Stored once pool is calculated; admin can override before running
    pool_total          = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    pool_5match         = models.DecimalField(max_digits=14, decimal_places=2, default=0)   # 40 %
    pool_4match         = models.DecimalField(max_digits=14, decimal_places=2, default=0)   # 35 %
    pool_3match         = models.DecimalField(max_digits=14, decimal_places=2, default=0)   # 25 %
    # Rolled-over jackpot added on top of pool_5match
    rollover_jackpot    = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    jackpot_rolled_over = models.BooleanField(default=False)   # True if this draw had no 5-match
    rollover_from       = models.ForeignKey(
        'self', null=True, blank=True, on_delete=models.SET_NULL, related_name='rollover_to'
    )
    notes               = models.TextField(blank=True)
    created_by          = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='created_draws'
    )
    created_at          = models.DateTimeField(auto_now_add=True)
    published_at        = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ['month', 'year']
        ordering        = ['-year', '-month']

    def __str__(self):
        return f"{calendar.month_name[self.month]} {self.year} [{self.get_status_display()}]"

    # ── Pool calculation ──────────────────────────────────────────────────────

    def calculate_pool(self, save: bool = True) -> Decimal:
        """
        Compute prize pool from active subscribers at the time of the draw.
        Adds any rolled-over jackpot to the 5-match tier.
        Returns the total pool amount.
        """
        from subscriptions.models import Subscription

        active_subs = Subscription.objects.filter(is_active=True, end_date__gte=timezone.now())
        total = Decimal('0')
        for sub in active_subs:
            monthly_equiv = PLAN_AMOUNTS.get(sub.plan, Decimal('0'))
            total += monthly_equiv * SUBSCRIPTION_POOL_PCT

        total = total.quantize(Decimal('0.01'))

        self.pool_total  = total
        self.pool_5match = (total * TIER_SHARES['5_match']).quantize(Decimal('0.01'))
        self.pool_4match = (total * TIER_SHARES['4_match']).quantize(Decimal('0.01'))
        self.pool_3match = (total * TIER_SHARES['3_match']).quantize(Decimal('0.01'))

        # Add rolled-over jackpot from previous draw
        if self.rollover_from and self.rollover_from.jackpot_rolled_over:
            self.rollover_jackpot = self.rollover_from.pool_5match
            self.pool_5match      = (self.pool_5match + self.rollover_jackpot).quantize(Decimal('0.01'))

        if save:
            self.save(update_fields=['pool_total', 'pool_5match', 'pool_4match', 'pool_3match', 'rollover_jackpot'])

        return total

    @property
    def effective_jackpot(self) -> Decimal:
        """Total jackpot amount (own 40 % + any rollover)."""
        return self.pool_5match

    # ── Number generation ─────────────────────────────────────────────────────

    def _generate_numbers(self) -> list:
        if self.draw_mode == 'algorithmic':
            from scores.models import Score
            raw_scores = list(Score.objects.values_list('score', flat=True))
            if raw_scores:
                freq: Counter = Counter((abs(s) % 49) + 1 for s in raw_scores)
                weighted: dict[int, int] = {n: min(freq.get(n, 1), 20) for n in range(1, 50)}
                pool: list[int] = [n for n, w in weighted.items() for _ in range(w)]
                chosen: set[int] = set()
                while len(chosen) < 5:
                    chosen.add(random.choice(pool))
                return sorted(chosen)
        return sorted(random.sample(range(1, 50), 5))

    # ── Run / compute results ─────────────────────────────────────────────────

    def run(self, simulate: bool = False) -> list:
        """
        1. Auto-calculate prize pool (if not already set).
        2. Generate drawn numbers.
        3. Two-pass result computation:
           Pass 1 — count winners per tier.
           Pass 2 — split tier pool equally, store per-winner amount.
        4. Handle jackpot rollover on official publish.
        """
        # Auto-calculate pool if not done yet
        if self.pool_total == 0:
            self.calculate_pool(save=False)

        drawn = self._generate_numbers()
        self.drawn_numbers = drawn
        self.status = 'simulated' if simulate else 'published'
        if not simulate:
            self.published_at = timezone.now()
        self.save(update_fields=[
            'drawn_numbers', 'status', 'published_at',
            'pool_total', 'pool_5match', 'pool_4match', 'pool_3match', 'rollover_jackpot',
        ])

        # Clear previous results (allows re-simulation)
        self.results.all().delete()

        drawn_set = set(drawn)
        entries   = list(self.entries.select_related('user').all())

        # ── Pass 1: classify each entry ────────────────────────────────────
        classified: list[tuple] = []   # (entry, matched, match_count, tier)
        tier_counts = {'5_match': 0, '4_match': 0, '3_match': 0}

        for entry in entries:
            matched     = sorted(set(entry.numbers) & drawn_set)
            match_count = len(matched)

            if   match_count == 5: tier = '5_match'
            elif match_count == 4: tier = '4_match'
            elif match_count == 3: tier = '3_match'
            else:                  tier = 'none'

            if tier != 'none':
                tier_counts[tier] += 1
            classified.append((entry, matched, match_count, tier))

        # ── Per-tier prize (split equally among winners) ──────────────────
        tier_prize: dict[str, Decimal] = {
            '5_match': (self.pool_5match / tier_counts['5_match']).quantize(Decimal('0.01'))
                        if tier_counts['5_match'] else Decimal('0'),
            '4_match': (self.pool_4match / tier_counts['4_match']).quantize(Decimal('0.01'))
                        if tier_counts['4_match'] else Decimal('0'),
            '3_match': (self.pool_3match / tier_counts['3_match']).quantize(Decimal('0.01'))
                        if tier_counts['3_match'] else Decimal('0'),
            'none':    Decimal('0'),
        }

        # ── Pass 2: create DrawResult rows ────────────────────────────────
        for (entry, matched, match_count, tier) in classified:
            is_winner = tier != 'none'
            DrawResult.objects.create(
                draw                = self,
                user                = entry.user,
                entry               = entry,
                matched_numbers     = matched,
                match_count         = match_count,
                prize_tier          = tier,
                prize_amount        = tier_prize[tier],
                verification_status = 'pending' if is_winner else 'none',
                payment_status      = 'pending' if is_winner else 'none',
            )

        # ── Jackpot rollover (official publish only) ──────────────────────
        if not simulate:
            if tier_counts['5_match'] == 0:
                self.jackpot_rolled_over = True
                self.save(update_fields=['jackpot_rolled_over'])

        return drawn


class UserDrawEntry(models.Model):
    """Five numbers (1-49) a user submits for a monthly draw."""
    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user       = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='draw_entries'
    )
    draw       = models.ForeignKey(MonthlyDraw, on_delete=models.CASCADE, related_name='entries')
    numbers    = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['user', 'draw']

    def __str__(self):
        return f"{self.user.username} — {self.draw} — {self.numbers}"


class DrawResult(models.Model):
    PRIZE_TIER_CHOICES = [
        ('none',    'No Prize'),
        ('3_match', '3-Number Match'),
        ('4_match', '4-Number Match'),
        ('5_match', '5-Number Match — Jackpot'),
    ]

    VERIFICATION_STATUS_CHOICES = [
        ('none',      'Not Required'),
        ('pending',   'Pending Upload'),
        ('submitted', 'Proof Submitted'),
        ('approved',  'Approved'),
        ('rejected',  'Rejected'),
    ]

    PAYMENT_STATUS_CHOICES = [
        ('none',    'No Payment'),
        ('pending', 'Pending Payment'),
        ('paid',    'Paid'),
    ]

    id              = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    draw            = models.ForeignKey(MonthlyDraw, on_delete=models.CASCADE, related_name='results')
    user            = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='draw_results'
    )
    entry           = models.OneToOneField(UserDrawEntry, on_delete=models.CASCADE)
    matched_numbers = models.JSONField(default=list)
    match_count     = models.PositiveSmallIntegerField(default=0)
    prize_tier      = models.CharField(max_length=10, choices=PRIZE_TIER_CHOICES, default='none')
    prize_amount    = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    # Verification & Payment
    verification_status = models.CharField(max_length=15, choices=VERIFICATION_STATUS_CHOICES, default='none')
    payment_status      = models.CharField(max_length=15, choices=PAYMENT_STATUS_CHOICES, default='none')
    proof_image         = models.ImageField(upload_to='draw_proofs/', null=True, blank=True)
    admin_notes         = models.TextField(blank=True)

    class Meta:
        unique_together = ['draw', 'user']

    def __str__(self):
        return f"{self.user.username} — {self.draw} — {self.prize_tier}"
