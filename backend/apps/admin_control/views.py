from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from apps.accounts.models import Employee
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from apps.accounts.serializers import LoginSerializer
from apps.accounts.views import LoginThrottle
# Create your views here.
class getEmployees(APIView):
    permission_classes = [IsAuthenticated]  # must be open, the user isn't logged in yet
    
    def get(self, request):
        employees = [
                        {
                            "employee_id": index + 1,
                            **employee,
                            "gender": Employee.Gender(employee["gender"]).label,
                            
                        }
                        for index, employee in enumerate(Employee.objects.select_related("role").values(
                            "first_name",
                            "last_name",
                            "role__role_name",
                            "employee_code",
                            "work_email",
                            "phone",
                            "national_id",
                            "gender",
                            "employment_status",
                            "employment_type",
                            "hire_date",
                        ))
                    ]
        
        # You can add any validation logic here if needed
        return Response({"Employees": employees})

class AdminLoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [LoginThrottle]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data.get("user", {}).get("email")
        if email:
            try:
                employee = Employee.objects.get(work_email=email)
                if not employee.is_superuser:
                    return Response({"detail": "You do not have permission to access the admin panel."}, status=status.HTTP_403_FORBIDDEN)
            except Employee.DoesNotExist:
                return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        return Response(serializer.validated_data)

class AdminLogoutView(APIView):
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
