from django.urls import path
from .views import getEmployees

urlpatterns = [
    path("employees", getEmployees.as_view(), name="get_employees"),
]