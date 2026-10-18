# apps/accounts/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import AnonRateThrottle
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import LoginSerializer, SignUPSerializer
from .models import Employee
from django.conf import settings
from django.http import JsonResponse
from django.shortcuts import redirect
from django.views.decorators.http import require_GET
from authlib.integrations.base_client.errors import OAuthError
from rest_framework_simplejwt.tokens import RefreshToken
from .models import RegistrationRequest
from .oidc import oauth
from ..helpers import get_user_permissions
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework.authentication import SessionAuthentication
from rest_framework_simplejwt.authentication import JWTAuthentication

# Assuming the first allowed origin is your frontend URL
FRONTEND_URL = "http://localhost:3000" 

class LoginThrottle(AnonRateThrottle):
    rate = "10/min"          # slows down password guessing

class LoginView(APIView):
    authentication_classes = []  # Disable authentication for login
    permission_classes = [AllowAny]      # must be open, the user isn't logged in yet
    throttle_classes = [LoginThrottle]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data)

class LogoutView(APIView):
    authentication_classes = [
        JWTAuthentication,
        SessionAuthentication,
    ]
        
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = (
            request.COOKIES.get("refresh_token")
            or request.data.get("refresh")
        )

        if not refresh_token:
            response = Response(
                {"error": "Refresh token cookie is missing."},
                status=status.HTTP_400_BAD_REQUEST,
            )
            response.delete_cookie("access_token", path="/", samesite="Lax")
            response.delete_cookie("refresh_token", path="/", samesite="Lax")
            response.delete_cookie("sessionid", path="/", samesite="Lax")
            return response

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()

        except TokenError:
            response = Response(
                {"error": "Invalid or expired refresh token."},
                status=status.HTTP_200_OK,
            )
            response.delete_cookie("access_token", path="/", samesite="Lax")
            response.delete_cookie("refresh_token", path="/", samesite="Lax")
            response.delete_cookie("sessionid", path="/", samesite="Lax")
            return response

        response = Response(
            {"error": "Successfully logged out."},
            status=status.HTTP_200_OK,
        )

        response.delete_cookie("access_token", path="/", samesite="Lax")
        response.delete_cookie("refresh_token", path="/", samesite="Lax")
        response.delete_cookie("sessionid", path="/", samesite="Lax")

        return response




class SignUP(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        serializer = SignUPSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        return Response(serializer.save())


class GetEmployeeStatus(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [LoginThrottle]

    def get(self, request):
        employee_email = request.data.get("email")
        if not employee_email:
            return Response({"error": "Employee email is required."}, status=400) 

        reg_req = RegistrationRequest.objects.filter(
            work_email=employee_email
        ).order_by('-created_at').first()
        
        return Response({
            "user" : {
                "first_name": reg_req.first_name,
                "last_name": reg_req.last_name,
                "status": reg_req.status
            }
        })

class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        employee = request.user

        refresh = RefreshToken.for_user(employee)
        data = get_user_permissions(employee, refresh)

        return Response(data, status=status.HTTP_200_OK)


class CookieDebugView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({
            "has_access_token": bool(
                request.COOKIES.get("access_token")
            ),
            "has_refresh_token": bool(
                request.COOKIES.get("refresh_token")
            ),
        })

@require_GET
def sso_start(request):
    callback_url = request.build_absolute_uri(
        "/api/auth/sso/callback/"
    )
    return oauth.google.authorize_redirect(
        request,
        callback_url,
    )
@require_GET
def sso_callback(request):
    try:
        token = oauth.google.authorize_access_token(request)
        claims = token.get("userinfo")

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

    # Login: existing active employee
    if employee:
        refresh = RefreshToken.for_user(employee)

        response = redirect(f"{FRONTEND_URL}/home")

        response.set_cookie(
            key="access_token",
            value=str(refresh.access_token),
            httponly=True,
            secure=False,
            samesite="Lax",
            path="/",
            max_age=3600,
        )

        response.set_cookie(
            key="refresh_token",
            value=str(refresh),
            httponly=True,
            secure=False,
            samesite="Lax",
            path="/",
            max_age=604800,
        )

        return response
    
    # Do not automatically link an existing employee by email
    if Employee.objects.filter(
        work_email__iexact=email
    ).exists():
        return redirect(
            f"{FRONTEND_URL}/login?message=contact_admin"
        )

    # Signup: create or retrieve a registration request
    registration, created = (
        RegistrationRequest.objects.get_or_create(
            sso_issuer=issuer,
            sso_subject=subject,
            registration_method="sso",
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

    if registration.status == "approved":
        return redirect(
            f"{FRONTEND_URL}/login?message=account_not_approved"
        )

    return redirect(
        f"{FRONTEND_URL}/login?message=registration_pending"
    )