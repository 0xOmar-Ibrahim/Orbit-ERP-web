from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from apps.accounts.models import Employee
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from apps.accounts.serializers import LoginSerializer
from apps.accounts.views import LoginThrottle
from .serializers import AddEmployeeSerializer, UpdateEmployeeSerializer
class getEmployees(APIView):
    permission_classes = [IsAuthenticated]  # must be open, the user isn't logged in yet

    def get(self, request):
        parameters = request.query_params

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
                        ).filter(**{field:value for field, value in parameters.items()}))
                    ]
        
        # You can add any validation logic here if needed
        return Response({"Employees": employees})
    
    def post(self, request):
        serializer = AddEmployeeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        # You can add any validation logic here if needed
        return Response({"message": "Employee added successfully."})

    def patch(self, request):
        employee_code = request.data.get("employee_code")
        if not employee_code:
            return Response({"error": "Employee code is required."}, status=400)

        try:
            employee = Employee.objects.get(employee_code=employee_code)
        except Employee.DoesNotExist:
            return Response({"error": "Employee not found."}, status=404)

        serializer = UpdateEmployeeSerializer(employee, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response({"message": "Employee updated successfully."})

    def delete(self, request):
        employee_code = request.data.get("employee_code")
        if not employee_code:
            return Response({"error": "Employee code is required."}, status=400)

        try:
            employee = Employee.objects.get(employee_code=employee_code)
        except Employee.DoesNotExist:
            return Response({"error": "Employee not found."}, status=404)

        employee.delete()
        return Response({"message": "Employee deleted successfully."})
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
