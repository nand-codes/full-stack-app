# charities/admin.py
from django.contrib import admin
from .models import Charity, CharityEvent, CharityEventPhoto, UserCharity


class CharityEventPhotoInline(admin.TabularInline):
    model   = CharityEventPhoto
    extra   = 1
    fields  = ['image', 'caption']


class CharityEventInline(admin.StackedInline):
    model            = CharityEvent
    extra            = 0
    show_change_link = True
    fields           = ['title', 'event_date', 'location', 'is_published']


@admin.register(Charity)
class CharityAdmin(admin.ModelAdmin):
    list_display       = ['name', 'is_featured', 'is_active', 'created_at']
    list_filter        = ['is_featured', 'is_active']
    search_fields      = ['name', 'description']
    prepopulated_fields = {'slug': ('name',)}
    inlines            = [CharityEventInline]


@admin.register(CharityEvent)
class CharityEventAdmin(admin.ModelAdmin):
    list_display  = ['title', 'charity', 'event_date', 'location', 'is_published']
    list_filter   = ['is_published', 'charity']
    search_fields = ['title', 'description']
    inlines       = [CharityEventPhotoInline]


@admin.register(CharityEventPhoto)
class CharityEventPhotoAdmin(admin.ModelAdmin):
    list_display = ['event', 'caption', 'uploaded_at']


@admin.register(UserCharity)
class UserCharityAdmin(admin.ModelAdmin):
    list_display  = ['user', 'charity', 'contribution_percentage', 'updated_at']
    search_fields = ['user__email', 'user__username']
