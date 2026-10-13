# apps/accounts/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import AnonRateThrottle
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import LoginSerializer
from .models import Employee
from django.conf import settings
from django.http import JsonResponse
from django.shortcuts import redirect
from django.views.decorators.http import require_GET
from authlib.integrations.base_client.errors import OAuthError
from rest_framework_simplejwt.tokens import RefreshToken
from .models import RegistrationRequest
from .oidc import oauth
from .helpers import get_user_permissions


# Assuming the first allowed origin is your frontend URL
FRONTEND_URL = settings.CORS_ALLOWED_ORIGINS[0]  

class LoginThrottle(AnonRateThrottle):
    rate = "10/min"          # slows down password guessing

class LoginView(APIView):
    permission_classes = [AllowAny]      # must be open, the user isn't logged in yet
    throttle_classes = [LoginThrottle]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data)

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            if not refresh_token:
                return Response({"detail": "Refresh token is required."}, status=status.HTTP_400_BAD_REQUEST)
            
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({"detail": "Successfully logged out."}, status=status.HTTP_200_OK)
        except Exception:
            return Response({"detail": "Invalid token."}, status=status.HTTP_400_BAD_REQUEST)


@require_GET
def sso_login(request):
    request.session["sso_mode"] = "login"

    callback_url = request.build_absolute_uri(
        "/api/auth/sso/callback/"
    )

    return oauth.google.authorize_redirect(
        request,
        callback_url,
    )


@require_GET
def sso_signup(request):
    request.session["sso_mode"] = "signup"

    callback_url = request.build_absolute_uri(
        "/api/auth/sso/callback/"
    )

    return oauth.google.authorize_redirect(
        request,
        callback_url,
    )


@require_GET
def sso_callback(request):
    mode = request.session.pop("sso_mode", None)

    if mode not in {"login", "signup"}:
        return JsonResponse(
            {"error": "Invalid or expired login flow"},
            status=400,
        )

    try:
        token = oauth.google.authorize_access_token(request)
        claims = token.get("userinfo")
        print(claims)
        
        if not claims:
            return JsonResponse(
                {"error": "User information is unavailable"},
                status=401,
            )

    except OAuthError:
        return JsonResponse(
            {"error": "SSO authentication failed"},
            status=401,
        )

    
    issuer = settings.SSO_ISSUER.rstrip("/")
    subject = claims.get("sub")
    email = claims.get("email")

    if (
        not subject
        or not email
        or claims.get("email_verified") is not True
    ):
        return JsonResponse(
            {"error": "A verified SSO identity is required"},
            status=403,
        )

    employee = Employee.objects.filter(
        sso_issuer=issuer,
        sso_subject=subject,
        sso_enabled=True,
        employment_status="active",
    ).select_related("role").first()

    if mode == "signup":
        if employee:
            return redirect(f"{FRONTEND_URL}/login?message=account_exists")

        # Never automatically attach an SSO identity to an
        # existing employee just because their email matches.
        if Employee.objects.filter(
            work_email__iexact=email
        ).exists():
            return redirect(
                f"{FRONTEND_URL}/login?message=contact_admin"
            )

        registration, created = (
            RegistrationRequest.objects.get_or_create(
                sso_issuer=issuer,
                sso_subject=subject,
                defaults={
                    "work_email": email,
                    "first_name": claims.get("given_name", ""),
                    "last_name": claims.get("family_name", ""),
                },
            )
        )

        if registration.status == "rejected":
            return redirect(
                f"{FRONTEND_URL}/login?message=registration_rejected"
            )

        return redirect(
            f"{FRONTEND_URL}/login?message=registration_pending"
        )

    # Login mode
    if employee is None:
        return redirect(
            f"{FRONTEND_URL}/login?message=account_not_approved"
        )

    refresh = RefreshToken.for_user(employee)

    # Illustrative token handoff only. See the secure session
    # handoff section below before using this in a browser.
    return JsonResponse(get_user_permissions(employee, refresh))