from django.urls import path
from .views import add_score, my_scores

urlpatterns = [
    path('add/',       add_score,  name='add-score'),
    path('my-scores/', my_scores,  name='my-scores'),
]
