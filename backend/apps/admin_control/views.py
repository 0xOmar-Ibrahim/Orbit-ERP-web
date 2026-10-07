from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from apps.accounts.models import Employee
from rest_framework.response import Response
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
