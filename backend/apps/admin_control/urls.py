from django.urls import path
from .views import Employees, AdminLoginView, AdminLogoutView, ApproveRegistrationView, RegistrationRequests

urlpatterns = [
    path("employee/", Employees.as_view(), name="get_employees"),
    path("employee/registration_requests/", RegistrationRequests.as_view(), name="get_registration_requests"),
    path("approved/employee/", ApproveRegistrationView.as_view(), name="get_employees"),
    path("login/", AdminLoginView.as_view(), name="admin_login"),
    path("logout/", AdminLogoutView.as_view(), name="admin_logout"),
]   