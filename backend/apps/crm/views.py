from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view
from .pagination import PageNumberPagination
from .models import Opportunity, Customer, Contact, Interaction, CustomerNote, LeadSource
from .serializers import (
    OpportunitySerializer,
    CustomerNoteSerializer,
    AddCustomerSerializer,
    UpdateCustomerSerializer,
    AddContactSerializer,
    UpdateContactSerializer,
    AddInteractionSerializer,
    UpdateInteractionSerializer,
    AddLeadSourceSerializer,
    UpdateLeadSourceSerializer
)


def is_valid_id(value):
    # IDs are positive integers; anything else would raise a ValueError in the ORM
    return str(value).isdigit()


class OpportunityView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        opp_id = request.query_params.get("opportunity_id") or request.query_params.get("id")
        if opp_id:
            if not is_valid_id(opp_id):
                return Response({"error": "opportunity_id must be an integer."}, status=status.HTTP_400_BAD_REQUEST)
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

        # Query filters matching Supabase schema fields
        filters = {}
        if "customer_id" in request.query_params:
            filters["customer_id"] = request.query_params["customer_id"]
        elif "customer" in request.query_params:
            filters["customer_id"] = request.query_params["customer"]

        if "employee_id" in request.query_params:
            filters["employee_id"] = request.query_params["employee_id"]
        elif "employee" in request.query_params:
            filters["employee_id"] = request.query_params["employee"]

        for field in ("customer_id", "employee_id"):
            if field in filters and not is_valid_id(filters[field]):
                return Response({"error": f"{field} must be an integer."}, status=status.HTTP_400_BAD_REQUEST)

        if "stage" in request.query_params:
            filters["stage"] = request.query_params["stage"].lower()

        if "status" in request.query_params:
            filters["status"] = request.query_params["status"].lower()

        queryset = Opportunity.objects.select_related("customer", "employee").filter(**filters)
        if "search" in request.query_params:
            queryset = queryset.filter(title__icontains=request.query_params["search"])

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

    def patch(self, request):
        opp_id = (
            request.data.get("opportunity_id")
            or request.query_params.get("opportunity_id")
            or request.data.get("id")
            or request.query_params.get("id")
        )
        if not opp_id:
            return Response({"error": "opportunity_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not is_valid_id(opp_id):
            return Response({"error": "opportunity_id must be an integer."}, status=status.HTTP_400_BAD_REQUEST)

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

    def put(self, request):
        return self.patch(request)

    def delete(self, request):
        opp_id = (
            request.data.get("opportunity_id")
            or request.query_params.get("opportunity_id")
            or request.data.get("id")
            or request.query_params.get("id")
        )
        if not opp_id:
            return Response({"error": "opportunity_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not is_valid_id(opp_id):
            return Response({"error": "opportunity_id must be an integer."}, status=status.HTTP_400_BAD_REQUEST)

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

        allowed_filters = {
            "customer_id",
            "customer_code",
            "first_name",
            "last_name",
            "phone",
            "company_name",
            "email",
            "address",
            "lead_source_id"
        }

        filters = {
            field: value
            for field, value in request_parameters.items()
            if field in allowed_filters and value
        }
        try: 
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
                    "lead_source_id",
                    "created_at",
                    "updated_at"
                ).filter(**filters)
            ]
        except:
            return Response({"error": "Invalid data entered."}, status=400)
        
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

        allowed_filters = {
            "contact_id",
            "name",
            "job_title",
            "email",
            "phone",
            "is_primary",
            "customer_id"
        }

        filters = {
            field: value
            for field, value in request_parameters.items()
            if field in allowed_filters and value
        }

        try :
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
                ).filter(**filters)
            ]
        except:
            return Response({"error": "Invalid data entered."}, status=400)
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

        allowed_filters = {
            "interaction_id",
            "type",
            "subject",
            "description",
            "customer_id",
            "employee_id",
            "contact_id",
            "opportunity_id"
        }

        filters = {
            field: value
            for field, value in request_parameters.items()
            if field in allowed_filters and value
        }
        try:
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
                    "employee_id",
                    "contact_id",
                    "opportunity_id"
                ).filter(**filters)
            ]
        except:
            return Response({"error": "Invalid data entered."}, status=400)
        
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


class CustomerNoteView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, customer_id=None, note_id=None):
        # 1. Single note lookup by note_id
        target_note_id = (
            note_id
            or request.query_params.get("note_id")
            or request.query_params.get("id")
        )
        if target_note_id:
            if not is_valid_id(target_note_id):
                return Response({"error": "note_id must be an integer."}, status=status.HTTP_400_BAD_REQUEST)
            try:
                note = CustomerNote.objects.select_related("customer", "employee").get(note_id=target_note_id)
                serializer = CustomerNoteSerializer(note)
                return Response({"note": serializer.data}, status=status.HTTP_200_OK)
            except CustomerNote.DoesNotExist:
                return Response({"error": "Customer note not found."}, status=status.HTTP_404_NOT_FOUND)

        # 2. Notes under a specific customer
        target_customer_id = (
            customer_id
            or request.query_params.get("customer_id")
            or request.query_params.get("customer")
        )
        if not target_customer_id:
            return Response(
                {"error": "customer_id is required to retrieve customer notes."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not is_valid_id(target_customer_id):
            return Response({"error": "customer_id must be an integer."}, status=status.HTTP_400_BAD_REQUEST)

        # Verify customer exists
        if not Customer.objects.filter(customer_id=target_customer_id).exists():
            return Response({"error": "Customer not found."}, status=status.HTTP_404_NOT_FOUND)

        notes = CustomerNote.objects.select_related("customer", "employee").filter(
            customer_id=target_customer_id
        )
        serializer = CustomerNoteSerializer(notes, many=True)
        return Response({
            "customer_id": int(target_customer_id),
            "total": notes.count(),
            "notes": serializer.data,
        }, status=status.HTTP_200_OK)

    def post(self, request, customer_id=None):
        data = request.data.copy() if hasattr(request.data, "copy") else dict(request.data)

        # Allow customer_id from path param if using /crm/customers/<customer_id>/notes/
        if customer_id and "customer_id" not in data and "customer" not in data:
            data["customer_id"] = customer_id

        # If employee_id is not provided, default to authenticated employee user
        if "employee_id" not in data and "employee" not in data:
            if hasattr(request.user, "employee_id"):
                data["employee_id"] = request.user.employee_id

        serializer = CustomerNoteSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        note = serializer.save()
        return Response({
            "message": "Customer note created successfully.",
            "note": CustomerNoteSerializer(note).data,
        }, status=status.HTTP_201_CREATED)

    def patch(self, request, note_id=None, customer_id=None):
        target_note_id = (
            note_id
            or request.data.get("note_id")
            or request.query_params.get("note_id")
            or request.data.get("id")
            or request.query_params.get("id")
        )
        if not target_note_id:
            return Response({"error": "note_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not is_valid_id(target_note_id):
            return Response({"error": "note_id must be an integer."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            note = CustomerNote.objects.get(note_id=target_note_id)
        except CustomerNote.DoesNotExist:
            return Response({"error": "Customer note not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = CustomerNoteSerializer(note, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_note = serializer.save()
        return Response({
            "message": "Customer note updated successfully.",
            "note": CustomerNoteSerializer(updated_note).data,
        }, status=status.HTTP_200_OK)

    def put(self, request, note_id=None, customer_id=None):
        return self.patch(request, note_id, customer_id)

    def delete(self, request, note_id=None, customer_id=None):
        target_note_id = (
            note_id
            or request.data.get("note_id")
            or request.query_params.get("note_id")
            or request.data.get("id")
            or request.query_params.get("id")
        )
        if not target_note_id:
            return Response({"error": "note_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not is_valid_id(target_note_id):
            return Response({"error": "note_id must be an integer."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            note = CustomerNote.objects.get(note_id=target_note_id)
        except CustomerNote.DoesNotExist:
            return Response({"error": "Customer note not found."}, status=status.HTTP_404_NOT_FOUND)

        note.delete()
        return Response({"message": "Customer note deleted successfully."}, status=status.HTTP_200_OK)

class GetOpportunities(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        params = request.query_params

        # Filtering
        allowed_filters = {
            "title",
            "stage",
            "status",
            "customer_id",
            "employee_id",
            "opportunity_id",
        }

        filters = {
            field: value
            for field, value in params.items()
            if field in allowed_filters and value
        }

        queryset = (
            Opportunity.objects
            .filter(**filters)
            .select_related(
                "customer",
                "customer__lead_source",
                "employee",
            )
            .prefetch_related(
                "customer__contacts",
                "customer__notes",
                "customer__notes__employee",
                "customer__interactions",
                "customer__interactions__employee",
            )
        )

        # Ordering
        allowed_ordering = {
            "opportunity_id",
            "-opportunity_id",
            "title",
            "-title",
            "estimated_value",
            "-estimated_value",
            "expected_close_date",
            "-expected_close_date",
            "probability",
            "-probability",
            "created_at",
            "-created_at",
        }

        ordering = params.get("ordering", "-created_at")

        if ordering in allowed_ordering:
            queryset = queryset.order_by(ordering)

        # Pagination
        paginator = PageNumberPagination()
        paginator.page_size = 10
        paginator.page_size_query_param = "page_size"
        paginator.max_page_size = 100

        page = paginator.paginate_queryset(
            queryset, request, view=self
        )

        opportunities = []

        for opportunity in page:
            customer = opportunity.customer
            employee = opportunity.employee
            lead_source = customer.lead_source

            opportunities.append({
                "opportunity_id": opportunity.opportunity_id,
                "title": opportunity.title,
                "estimated_value": opportunity.estimated_value,
                "currency": opportunity.currency,
                "stage": opportunity.stage,
                "probability": opportunity.probability,
                "expected_close_date": opportunity.expected_close_date,
                "status": opportunity.status,
                "lost_reason": opportunity.lost_reason,
                "created_at": opportunity.created_at,
                "closed_at": opportunity.closed_at,

                "customer": {
                    "customer_id": customer.customer_id,
                    "customer_code": customer.customer_code,
                    "first_name": customer.first_name,
                    "last_name": customer.last_name,
                    "phone": customer.phone,
                    "company_name": customer.company_name,
                    "email": customer.email,
                    "address": customer.address,

                    "lead_source": (
                        {
                            "source_id": lead_source.source_id,
                            "name": lead_source.name,
                        }
                        if lead_source else None
                    ),

                    "created_at": customer.created_at,
                    "updated_at": customer.updated_at,

                    "contacts": [
                        {
                            "contact_id": contact.contact_id,
                            "name": contact.name,
                            "job_title": contact.job_title,
                            "email": contact.email,
                            "phone": contact.phone,
                            "is_primary": contact.is_primary,
                        }
                        for contact in customer.contacts.all()
                    ],

                    "notes": [
                        {
                            "note_id": note.note_id,
                            "employee_id": note.employee_id,
                            "employee_name": (
                                f"{note.employee.first_name} "
                                f"{note.employee.last_name}"
                            ),
                            "note_text": note.note_text,
                            "created_at": note.created_at,
                        }
                        for note in customer.notes.all()
                    ],

                    "interactions": [
                        {
                            "interaction_id": interaction.interaction_id,
                            "employee_id": interaction.employee_id,
                            "employee_name": (
                                f"{interaction.employee.first_name} "
                                f"{interaction.employee.last_name}"
                            ),
                            "type": interaction.type,
                            "subject": interaction.subject,
                            "description": interaction.description,
                            "interaction_date": interaction.interaction_date,
                            "contact_id": interaction.contact_id,
                            "opportunity_id": interaction.opportunity_id,
                        }
                        for interaction in opportunity.interactions.select_related(
                            "employee", "contact"
                        ).all()
                    ],
                },

                "employee": {
                    "employee_id": employee.employee_id,
                    "employee_name": (
                        f"{employee.first_name} {employee.last_name}"
                    ),
                },
            })

        return paginator.get_paginated_response(opportunities)   


class LeadSourceManagement(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        request_parameters = request.query_params

        allowed_filters = {
            "source_id",
            "name",
            "description",
            "is_active",
        }

        filters = {
            field: value
            for field, value in request_parameters.items()
            if field in allowed_filters and value
        }

        try:
            lead_sources = [
                {
                    **source,
                }
                for source in LeadSource.objects.values(
                    "source_id",
                    "name",
                    "description",
                    "is_active",
                ).filter(**filters)
            ]
        except Exception:
            return Response(
                {"error": "Invalid data entered."},
                status=400,
            )

        return Response({"LeadSources": lead_sources})

    def post(self, request):
        serializer = AddLeadSourceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {"message": "Lead source added successfully."},
            status=201,
        )

    def patch(self, request):
        source_id = request.data.get("source_id")

        if not source_id:
            return Response(
                {"error": "Lead source ID is required."},
                status=400,
            )

        try:
            lead_source = LeadSource.objects.get(source_id=source_id)
        except LeadSource.DoesNotExist:
            return Response(
                {"error": "Lead source not found."},
                status=404,
            )

        serializer = UpdateLeadSourceSerializer(
            lead_source,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {"message": "Lead source updated successfully."},
            status=200,
        )

    def delete(self, request):
        source_id = request.data.get("source_id")

        if not source_id:
            return Response(
                {"error": "Lead source ID is required."},
                status=400,
            )

        try:
            lead_source = LeadSource.objects.get(source_id=source_id)
        except LeadSource.DoesNotExist:
            return Response(
                {"error": "Lead source not found."},
                status=404,
            )

        lead_source.delete()

        return Response(
            {"message": "Lead source deleted successfully."},
            status=200,
        )