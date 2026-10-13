from django.urls import path
from .views import LoginView, LogoutView, sso_callback, sso_login, sso_signup

urlpatterns = [
    path("", LoginView.as_view()),
    path("login/", LoginView.as_view()),
    path("logout/", LogoutView.as_view()),
    path("sso/login/", sso_login, name="sso-login"),
    path("sso/signup/", sso_signup, name="sso-signup"),
    path("sso/callback/", sso_callback, name="sso-callback"),
]