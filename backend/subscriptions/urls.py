from django.urls import path
from .views import create_order, verify_payment, my_subscription, cancel_subscription, plan_info

urlpatterns = [
    path('plans/',           plan_info,           name='plan-info'),
    path('create-order/',    create_order,        name='create-order'),
    path('verify-payment/',  verify_payment,      name='verify-payment'),
    path('me/',              my_subscription,     name='my-subscription'),
    path('cancel/',          cancel_subscription, name='cancel-subscription'),
]
