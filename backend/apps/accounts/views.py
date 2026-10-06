# apps/accounts/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import AnonRateThrottle
from .serializers import LoginSerializer

class LoginThrottle(AnonRateThrottle):
    rate = "10/min"          # slows down password guessing

class LoginView(APIView):
    permission_classes = [AllowAny]      # must be open, the user isn't logged in yet
    throttle_classes = [LoginThrottle]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data)
