# draws/admin.py
import calendar
from django.contrib import admin
from django.utils.html import format_html
from .models import MonthlyDraw, UserDrawEntry, DrawResult


class DrawResultInline(admin.TabularInline):
    model        = DrawResult
    extra        = 0
    readonly_fields = ['user', 'matched_numbers', 'match_count', 'prize_tier', 'prize_amount']
    can_delete   = False

    def has_add_permission(self, request, obj=None):
        return False


class UserDrawEntryInline(admin.TabularInline):
    model       = UserDrawEntry
    extra       = 0
    readonly_fields = ['user', 'numbers', 'created_at']
    can_delete  = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(MonthlyDraw)
class MonthlyDrawAdmin(admin.ModelAdmin):
    list_display  = ['draw_label', 'draw_mode', 'drawn_numbers_display', 'status_badge',
                     'entry_count', 'winner_count',
                     'pool_total_display', 'jackpot_display', 'jackpot_rolled_over', 'published_at']
    list_filter   = ['status', 'draw_mode', 'year', 'jackpot_rolled_over']
    readonly_fields = [
        'drawn_numbers', 'status', 'jackpot_rolled_over', 'published_at',
        'created_by', 'created_at',
        'pool_total', 'pool_5match', 'pool_4match', 'pool_3match', 'rollover_jackpot',
    ]
    inlines       = [UserDrawEntryInline, DrawResultInline]
    actions       = ['action_calculate_pool', 'action_simulate', 'action_publish']

    def draw_label(self, obj):
        return f"{calendar.month_name[obj.month]} {obj.year}"
    draw_label.short_description = 'Draw'

    def drawn_numbers_display(self, obj):
        if obj.drawn_numbers:
            return ' · '.join(str(n) for n in obj.drawn_numbers)
        return '—'
    drawn_numbers_display.short_description = 'Drawn Numbers'

    def pool_total_display(self, obj):
        if obj.pool_total:
            return f"₹{obj.pool_total:,.0f}"
        return '—'
    pool_total_display.short_description = 'Pool Total'

    def jackpot_display(self, obj):
        if obj.pool_5match:
            rollover = f" (+₹{obj.rollover_jackpot:,.0f} rollover)" if obj.rollover_jackpot else ""
            return f"₹{obj.pool_5match:,.0f}{rollover}"
        return '—'
    jackpot_display.short_description = 'Jackpot (5-match)'

    def status_badge(self, obj):
        colours = {'pending': '#f59e0b', 'simulated': '#3b82f6', 'published': '#10b981'}
        c = colours.get(obj.status, '#6b7280')
        return format_html(
            '<span style="background:{};color:#fff;padding:2px 10px;border-radius:50px;font-size:0.78rem">{}</span>',
            c, obj.get_status_display()
        )
    status_badge.short_description = 'Status'

    def entry_count(self, obj):
        return obj.entries.count()
    entry_count.short_description = 'Entries'

    def winner_count(self, obj):
        return obj.results.exclude(prize_tier='none').count()
    winner_count.short_description = 'Winners'

    @admin.action(description='💰 Calculate prize pool from active subscribers')
    def action_calculate_pool(self, request, queryset):
        for draw in queryset.exclude(status='published'):
            total = draw.calculate_pool()
            self.message_user(request, f"{draw}: pool calculated — ₹{total:,.0f} total.")

    @admin.action(description='▶ Simulate selected draws (preview)')
    def action_simulate(self, request, queryset):
        for draw in queryset.exclude(status='published'):
            draw.run(simulate=True)
        self.message_user(request, 'Simulation complete.')

    @admin.action(description='✅ Publish selected draws (official)')
    def action_publish(self, request, queryset):
        for draw in queryset.exclude(status='published'):
            draw.run(simulate=False)
        self.message_user(request, 'Draws published.')


@admin.register(UserDrawEntry)
class UserDrawEntryAdmin(admin.ModelAdmin):
    list_display  = ['user', 'draw', 'numbers', 'created_at']
    list_filter   = ['draw']
    search_fields = ['user__email', 'user__username']


@admin.register(DrawResult)
class DrawResultAdmin(admin.ModelAdmin):
    list_display  = ['user', 'draw', 'prize_tier', 'prize_amount', 'verification_status', 'payment_status']
    list_filter   = ['draw', 'prize_tier', 'verification_status', 'payment_status']
    search_fields = ['user__email', 'user__username']
    readonly_fields = ['draw', 'user', 'entry', 'matched_numbers', 'match_count', 'prize_tier', 'prize_amount']
    list_editable = ['verification_status', 'payment_status']
