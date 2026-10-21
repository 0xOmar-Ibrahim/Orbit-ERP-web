from django.urls import path
from .views import LoginView, LogoutView, SignUP, GetEmployeeStatus, CurrentUserView, CookieDebugView, sso_callback, sso_start
from rest_framework_simplejwt.views import TokenRefreshView
from .views import LoginView, LogoutView

urlpatterns = [
    path("", LoginView.as_view()),

    path("login/", LoginView.as_view()),
    path("signup/", SignUP.as_view()),
    path("logout/", LogoutView.as_view()),
    path("me/", CurrentUserView.as_view()),
    path("sso/", sso_start, name="sso-start"),
    path("sso/callback/", sso_callback, name="sso-callback"),

    path("cookie-debug/", CookieDebugView.as_view()),

    path("get_employee_status/", GetEmployeeStatus.as_view()),

    path("refresh/", TokenRefreshView.as_view()),

]