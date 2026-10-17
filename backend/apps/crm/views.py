from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .models import Opportunity
from .serializers import OpportunitySerializer


class OpportunityView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, opportunity_id=None):
        opp_id = opportunity_id or request.query_params.get("opportunity_id") or request.query_params.get("id")
        if opp_id:
            try:
                opportunity = Opportunity.objects.select_related("customer", "employee").get(opportunity_id=opp_id)
                serializer = OpportunitySerializer(opportunity)
                return Response({"opportunity": serializer.data}, status=status.HTTP_200_OK)
            except Opportunity.DoesNotExist:
                return Response({"error": "Opportunity not found."}, status=status.HTTP_404_NOT_FOUND)

        # Range pagination: startrange and endrange with defaults 0 to 50
        try:
            start_range = int(request.query_params.get("startrange", request.query_params.get("start_range", 0)))
            if start_range < 0:
                start_range = 0
        except (ValueError, TypeError):
            start_range = 0

        try:
            end_range = int(request.query_params.get("endrange", request.query_params.get("end_range", 50)))
            if end_range < start_range:
                end_range = start_range + 50
        except (ValueError, TypeError):
            end_range = 50

        queryset = Opportunity.objects.select_related("customer", "employee").all()
        total_count = queryset.count()
        opportunities = queryset[start_range:end_range]
        serializer = OpportunitySerializer(opportunities, many=True)

        return Response({
            "total": total_count,
            "startrange": start_range,
            "endrange": end_range,
            "opportunities": serializer.data,
        }, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = OpportunitySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        opportunity = serializer.save()
        return Response({
            "message": "Opportunity created successfully.",
            "opportunity": OpportunitySerializer(opportunity).data,
        }, status=status.HTTP_201_CREATED)

    def patch(self, request, opportunity_id=None):
        opp_id = opportunity_id or request.data.get("opportunity_id") or request.query_params.get("opportunity_id") or request.data.get("id")
        if not opp_id:
            return Response({"error": "opportunity_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            opportunity = Opportunity.objects.get(opportunity_id=opp_id)
        except Opportunity.DoesNotExist:
            return Response({"error": "Opportunity not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = OpportunitySerializer(opportunity, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_opportunity = serializer.save()
        return Response({
            "message": "Opportunity updated successfully.",
            "opportunity": OpportunitySerializer(updated_opportunity).data,
        }, status=status.HTTP_200_OK)

    def delete(self, request, opportunity_id=None):
        opp_id = opportunity_id or request.data.get("opportunity_id") or request.query_params.get("opportunity_id") or request.data.get("id")
        if not opp_id:
            return Response({"error": "opportunity_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            opportunity = Opportunity.objects.get(opportunity_id=opp_id)
        except Opportunity.DoesNotExist:
            return Response({"error": "Opportunity not found."}, status=status.HTTP_404_NOT_FOUND)

        opportunity.delete()
        return Response({"message": "Opportunity deleted successfully."}, status=status.HTTP_200_OK)

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
