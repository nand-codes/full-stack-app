# charities/models.py
import uuid
from django.db import models
from django.conf import settings


class Charity(models.Model):
    id               = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name             = models.CharField(max_length=255)
    slug             = models.SlugField(unique=True)
    description      = models.TextField()
    short_description = models.CharField(max_length=300, blank=True)
    image            = models.ImageField(upload_to='charities/', blank=True, null=True)
    website_url      = models.URLField(blank=True)
    is_featured      = models.BooleanField(default=False)
    is_active        = models.BooleanField(default=True)
    created_at       = models.DateTimeField(auto_now_add=True)
    updated_at       = models.DateTimeField(auto_now=True)

    class Meta:
        ordering        = ['-is_featured', 'name']
        verbose_name_plural = 'charities'

    def __str__(self):
        return self.name


class CharityEvent(models.Model):
    """Golf days and other charity events created by admin."""
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    charity     = models.ForeignKey(Charity, on_delete=models.CASCADE, related_name='events')
    title       = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    event_date  = models.DateField()
    location    = models.CharField(max_length=255, blank=True)
    is_published = models.BooleanField(default=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['event_date']

    def __str__(self):
        return f"{self.charity.name} — {self.title}"


class CharityEventPhoto(models.Model):
    """Photos uploaded by admin for a charity event."""
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event       = models.ForeignKey(CharityEvent, on_delete=models.CASCADE, related_name='photos')
    image       = models.ImageField(upload_to='charity_events/')
    caption     = models.CharField(max_length=255, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Photo for {self.event.title}"


class UserCharity(models.Model):
    """A user's chosen charity + the % of their subscription they contribute."""
    user                    = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='charity_selection'
    )
    charity                 = models.ForeignKey(
        Charity, on_delete=models.SET_NULL, null=True, related_name='supporters'
    )
    contribution_percentage = models.FloatField(default=10.0)
    updated_at              = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if self.contribution_percentage < 10:
            raise ValueError("Minimum contribution is 10%")
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user} → {self.charity} ({self.contribution_percentage}%)"