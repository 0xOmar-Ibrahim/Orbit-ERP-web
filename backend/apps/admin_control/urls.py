from django.urls import path
from .views import getEmployees, AdminLoginView, AdminLogoutView, ApproveRegistrationView

urlpatterns = [
    path("employees", getEmployees.as_view(), name="get_employees"),
    path("approved/employee", ApproveRegistrationView.as_view(), name="get_employees"),
    path("login", AdminLoginView.as_view(), name="admin_login"),
    path("logout", AdminLogoutView.as_view(), name="admin_logout"),
]