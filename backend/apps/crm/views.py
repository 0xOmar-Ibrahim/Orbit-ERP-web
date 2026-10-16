from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from apps.crm.models import Customer, Contact, Interaction
from rest_framework.response import Response
from apps.crm.serializers import AddCustomerSerializer, UpdateCustomerSerializer, UpdateContactSerializer, AddContactSerializer, AddInteractionSerializer, UpdateInteractionSerializer

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


class ContactManagement(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        request_parameters = request.query_params

        contacts = [
            {
                **contact, 
            } 
            for contact in Contact.objects.values(
                "customer_id",
                "contact_id",
                "name",
                "job_title",
                "phone",
                "email",
                "is_primary"
            ).filter(**{field:value for field, value in request_parameters.items()})
        ]

        return Response({"Contacts": contacts})
    
    def post(self, request):
        serializer = AddContactSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response({"message": "Contact added successfully."})

    def patch(self, request):
        contact_id = request.data.get("contact_id")
        if not contact_id:
            return Response({"error": "Contact ID is required."}, status=400)

        try:
            contact = Contact.objects.get(contact_id=contact_id)
        except Contact.DoesNotExist:
            return Response({"error": "Contact not found."}, status=404)

        serializer = UpdateContactSerializer(contact, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response({"message": "Contact updated successfully."})

    def delete(self, request):
        contact_id = request.data.get("contact_id")
        if not contact_id:
            return Response({"error": "Contact ID is required."}, status=400)

        try:
            contact = Contact.objects.get(contact_id=contact_id)
        except Contact.DoesNotExist:
            return Response({"error": "Contact not found."}, status=404)

        contact.delete()
        return Response({"message": "Contact deleted successfully."})

class InteractionManagement(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        request_parameters = request.query_params

        interactions = [
            {
                **interaction, 
            } 
            for interaction in Interaction.objects.values(
                "interaction_id",
                "type",
                "subject",
                "description",
                "interaction_date",
                "customer_id",
                "employee_id"
            ).filter(**{field:value for field, value in request_parameters.items()})
        ]

        return Response({"Interactions": interactions})
    
    def post(self, request):
        serializer = AddInteractionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response({"message": "Interaction added successfully."})

    def patch(self, request):
        interaction_id = request.data.get("interaction_id")
        if not interaction_id:
            return Response({"error": "Interaction ID is required."}, status=400)

        try:
            interaction = Interaction.objects.get(interaction_id=interaction_id)
        except Interaction.DoesNotExist:
            return Response({"error": "Interaction not found."}, status=404)

        serializer = UpdateInteractionSerializer(interaction, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response({"message": "Interaction updated successfully."})

    def delete(self, request):
        interaction_id = request.data.get("interaction_id")
        if not interaction_id:
            return Response({"error": "Interaction ID is required."}, status=400)

        try:
            interaction = Interaction.objects.get(interaction_id=interaction_id)
        except Interaction.DoesNotExist:
            return Response({"error": "Interaction not found."}, status=404)

        interaction.delete()
        return Response({"message": "Interaction deleted successfully."})