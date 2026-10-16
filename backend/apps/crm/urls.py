from django.urls import path
from .views import CustomerManagement

urlpatterns = [
    path("customers/", CustomerManagement.as_view(), name="get_employees"),
    
]