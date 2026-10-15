from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from apps.crm.models import Customer
from rest_framework.response import Response
from apps.crm.serializers import AddCustomerSerializer, UpdateCustomerSerializer

class CustomerManagement(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        request_parameters = request.query_params

        customers = [
            {
                **customer, 
            } 
            for customer in Customer.objects.values(
                "customer_id",
                "customer_code",
                "first_name",
                "last_name",
                "phone",
                "company_name",
                "email",
                "address",
                "campaign",
                "created_at",
                "updated_at"
            ).filter(**{field:value for field, value in request_parameters.items()})
        ]

        return Response({"Customers": customers})
    
    def post(self, request):
        serializer = AddCustomerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response({"message": "Customer added successfully."})

    def patch(self, request):
        customer_code = request.data.get("customer_code")
        if not customer_code:
            return Response({"error": "Customer code is required."}, status=400)

        try:
            customer = Customer.objects.get(customer_code=customer_code)
        except Customer.DoesNotExist:
            return Response({"error": "Customer not found."}, status=404)

        serializer = UpdateCustomerSerializer(customer, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response({"message": "Customer updated successfully."})

    def delete(self, request):
        customer_code = request.data.get("customer_code")
        if not customer_code:
            return Response({"error": "Customer code is required."}, status=400)

        try:
            customer = Customer.objects.get(customer_code=customer_code)
        except Customer.DoesNotExist:
            return Response({"error": "Customer not found."}, status=404)

        customer.delete()
        return Response({"message": "Customer deleted successfully."})