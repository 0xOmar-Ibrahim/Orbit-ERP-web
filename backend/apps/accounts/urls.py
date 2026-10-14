from django.urls import path
from .views import LoginView, LogoutView, SignUP, GetEmployeeStatus, sso_callback, sso_start

urlpatterns = [
    path("", LoginView.as_view()),

    path("login", LoginView.as_view()),
    path("signup", SignUP.as_view()),
    path("logout", LogoutView.as_view()),

    path("sso", sso_start, name="sso-start"),
    path("sso/callback", sso_callback, name="sso-callback"),

    path("get_employee_status", GetEmployeeStatus.as_view()),
]