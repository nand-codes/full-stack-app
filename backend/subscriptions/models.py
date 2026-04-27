from django.db import models
from django.conf import settings
from datetime import timedelta
from django.utils import timezone


class Subscription(models.Model):
    PLAN_CHOICES = (
        ('monthly', 'Monthly'),
        ('yearly',  'Yearly'),
    )

    user       = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='subscription')
    plan       = models.CharField(max_length=10, choices=PLAN_CHOICES)
    start_date = models.DateTimeField(auto_now_add=True)
    end_date   = models.DateTimeField()
    is_active  = models.BooleanField(default=True)

    def save(self, *args, **kwargs):
        if not self.end_date:
            days = 30 if self.plan == 'monthly' else 365
            self.end_date = timezone.now() + timedelta(days=days)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user} - {self.plan}"