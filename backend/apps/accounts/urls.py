from django.urls import path
from .views import CustomTokenRefreshView, LoginView, LogoutView, SignUP, GetEmployeeStatus, CurrentUserView, CookieDebugView, sso_mobile, sso_callback, sso_start 

urlpatterns = [
    path("", LoginView.as_view()),

    path("login/", LoginView.as_view()),
    path("signup/", SignUP.as_view()),
    path("logout/", LogoutView.as_view()),
    path("me/", CurrentUserView.as_view()),
    
    path("sso_mobile/", sso_mobile.as_view(), name="sso-start"),
    path("sso/", sso_start, name="sso-start"),
    path("sso/callback/", sso_callback, name="sso-callback"),

    path("cookie-debug/", CookieDebugView.as_view()),

    path("get_employee_status/", GetEmployeeStatus.as_view()),

    path("refresh/", CustomTokenRefreshView.as_view()),
]