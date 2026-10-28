from django.utils import timezone
from rest_framework import serializers
from .models import LeadSource, Customer, Contact, Interaction, Opportunity, CustomerNote
from apps.accounts.models import Employee
from apps.helpers import generate_code


class LeadSourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeadSource
        fields = ["source_id", "name", "description", "is_active"]
        read_only_fields = ["source_id"]

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Name cannot be blank.")
        return value


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = "__all__"


class OpportunitySerializer(serializers.ModelSerializer):
    customer_id = serializers.PrimaryKeyRelatedField(
        queryset=Customer.objects.all(),
        source="customer",
        required=True,
    )
    employee_id = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(),
        source="employee",
        required=True,
    )
    customer_details = serializers.SerializerMethodField(read_only=True)
    employee_details = serializers.SerializerMethodField(read_only=True)
    estimated_value = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        coerce_to_string=False,
        required=False,
        default=0.00,
    )
    # probability, stage and status have no serializer defaults so validate() can tell
    # which ones the client actually sent; the model defaults apply otherwise
    probability = serializers.IntegerField(
        min_value=0,
        max_value=100,
        required=False,
    )
    expected_close_date = serializers.DateField(
        required=False,
        allow_null=True,
    )
    stage = serializers.CharField(required=False)
    status = serializers.CharField(required=False)
    currency = serializers.CharField(required=False, max_length=3)
    lost_reason = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Opportunity
        fields = [
            "opportunity_id",
            "title",
            "estimated_value",
            "currency",
            "stage",
            "probability",
            "expected_close_date",
            "status",
            "lost_reason",
            "created_at",
            "closed_at",
            "customer_id",
            "employee_id",
            "customer",
            "employee",
            "customer_details",
            "employee_details",
        ]
        read_only_fields = ["opportunity_id", "customer", "employee", "created_at", "closed_at"]

    def get_customer_details(self, obj):
        try:
            if obj.customer:
                return {
                    "customer_id": obj.customer.customer_id,
                    "customer_code": obj.customer.customer_code,
                    "name": f"{obj.customer.first_name} {obj.customer.last_name}".strip(),
                    "company_name": obj.customer.company_name,
                    "email": obj.customer.email,
                    "phone": obj.customer.phone,
                }
        except Exception:
            pass
        return None

    def get_employee_details(self, obj):
        try:
            if obj.employee:
                return {
                    "employee_id": obj.employee.employee_id,
                    "employee_code": obj.employee.employee_code,
                    "name": f"{obj.employee.first_name} {obj.employee.last_name}".strip(),
                    "work_email": obj.employee.work_email,
                }
        except Exception:
            pass
        return None

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, "copy") else dict(data)
        # Support customer/customer_id and employee/employee_id interchangeably
        if "customer" in data and "customer_id" not in data:
            data["customer_id"] = data["customer"]
        if "employee" in data and "employee_id" not in data:
            data["employee_id"] = data["employee"]

        # Handle empty string inputs from forms for nullable/default fields
        if data.get("expected_close_date") == "":
            data["expected_close_date"] = None
        # Only touch keys that were sent, so a partial update doesn't reset them
        if "estimated_value" in data and data["estimated_value"] in ("", None):
            data["estimated_value"] = 0
        if "probability" in data and data["probability"] in ("", None):
            # Blank probability means "use the stage default"
            data.pop("probability")

        # Normalize string choices
        if "stage" in data and isinstance(data["stage"], str):
            data["stage"] = data["stage"].strip().lower()
        if "status" in data and isinstance(data["status"], str):
            data["status"] = data["status"].strip().lower()

        return super().to_internal_value(data)

    def validate_stage(self, value):
        valid_stages = [choice[0] for choice in Opportunity.Stage.choices]
        val = value.strip().lower() if isinstance(value, str) else value
        if val not in valid_stages:
            raise serializers.ValidationError(
                f"Invalid stage '{value}'. Valid choices are: {', '.join(valid_stages)}."
            )
        return val

    def validate_status(self, value):
        valid_statuses = [choice[0] for choice in Opportunity.Status.choices]
        val = value.strip().lower() if isinstance(value, str) else value
        if val not in valid_statuses:
            raise serializers.ValidationError(
                f"Invalid status '{value}'. Valid choices are: {', '.join(valid_statuses)}."
            )
        return val

    def validate_currency(self, value):
        value = value.strip().upper()
        if len(value) != 3 or not value.isalpha():
            raise serializers.ValidationError("Currency must be a 3-letter code, e.g. EGP or USD.")
        return value

    def validate(self, attrs):
        instance = self.instance
        Stage, Status = Opportunity.Stage, Opportunity.Status

        # Winning or losing a deal moves it to the closed stage
        if attrs.get("status") in (Status.WON, Status.LOST) and "stage" not in attrs:
            attrs["stage"] = Stage.CLOSED

        stage = attrs.get("stage", instance.stage if instance else Stage.LEAD)
        status_ = attrs.get("status", instance.status if instance else Status.OPEN)

        # Mirrors the chk_opportunity_stage_status constraint, plus its converse
        if stage == Stage.CLOSED and status_ == Status.OPEN:
            raise serializers.ValidationError({"status": "A closed opportunity must be marked won or lost."})
        if stage != Stage.CLOSED and status_ != Status.OPEN:
            raise serializers.ValidationError({"stage": "A won or lost opportunity must be in the closed stage."})

        if status_ == Status.LOST:
            lost_reason = attrs.get("lost_reason", instance.lost_reason if instance else "")
            if not lost_reason.strip():
                raise serializers.ValidationError({"lost_reason": "A reason is required when an opportunity is lost."})

        # Auto-set probability from the stage unless the client overrides it
        stage_changed = instance is None or stage != instance.stage or status_ != instance.status
        if "probability" not in attrs and stage_changed:
            if status_ == Status.LOST:
                attrs["probability"] = 0
            else:
                attrs["probability"] = Opportunity.STAGE_PROBABILITY[stage]

        # Stamp closed_at when the deal is won/lost, clear it if it's reopened
        if status_ == Status.OPEN:
            attrs["closed_at"] = None
        elif instance is None or instance.status == Status.OPEN:
            attrs["closed_at"] = timezone.now()

        return attrs

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        # Guarantee customer_id and employee_id exist as integer foreign keys matching Supabase schema
        rep["customer_id"] = instance.customer_id
        rep["employee_id"] = instance.employee_id
        # Compatibility aliases
        rep["customer"] = instance.customer_id
        rep["employee"] = instance.employee_id
        return rep


class CustomerNoteSerializer(serializers.ModelSerializer):
    customer_id = serializers.PrimaryKeyRelatedField(
        queryset=Customer.objects.all(),
        source="customer",
        required=True,
    )
    employee_id = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(),
        source="employee",
        required=False,
    )
    customer_details = serializers.SerializerMethodField(read_only=True)
    employee_details = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = CustomerNote
        fields = [
            "note_id",
            "customer_id",
            "employee_id",
            "note_text",
            "created_at",
            "customer_details",
            "employee_details",
        ]
        read_only_fields = ["note_id", "created_at"]

    def get_employee_details(self, obj):
        try:
            if obj.employee:
                return {
                    "employee_id": obj.employee.employee_id,
                    "employee_code": obj.employee.employee_code,
                    "name": f"{obj.employee.first_name} {obj.employee.last_name}".strip(),
                    "work_email": obj.employee.work_email,
                }
        except Exception:
            pass
        return None

    def get_customer_details(self, obj):
        try:
            if obj.customer:
                return {
                    "customer_id": obj.customer.customer_id,
                    "customer_code": obj.customer.customer_code,
                    "name": f"{obj.customer.first_name} {obj.customer.last_name}".strip(),
                    "company_name": obj.customer.company_name,
                }
        except Exception:
            pass
        return None

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, "copy") else dict(data)
        if "customer" in data and "customer_id" not in data:
            data["customer_id"] = data["customer"]
        if "employee" in data and "employee_id" not in data:
            data["employee_id"] = data["employee"]
        return super().to_internal_value(data)

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep["customer_id"] = instance.customer_id
        rep["employee_id"] = instance.employee_id
        return rep


class CustomerRelationsMixin(serializers.Serializer):
    # Only active lead sources can be assigned to a customer
    lead_source_id = serializers.PrimaryKeyRelatedField(
        queryset=LeadSource.objects.filter(is_active=True),
        source="lead_source",
        required=False,
        allow_null=True,
    )
    assigned_employee_id = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(),
        source="assigned_employee",
        required=False,
        allow_null=True,
    )


class AddCustomerSerializer(CustomerRelationsMixin, serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = [
            "customer_id",
            "first_name",
            "last_name",
            "phone",
            "company_name",
            "email",
            "address",
            "lead_source_id",
            "assigned_employee_id",
        ]

    def validate(self, attrs):
        return super().validate(attrs)

    def create(self, validated_data):
        customer_code = generate_code(account_type=2)
        new_customer = Customer.objects.create(**validated_data, customer_code=customer_code)
        new_customer.save()
        return new_customer


class UpdateCustomerSerializer(CustomerRelationsMixin, serializers.ModelSerializer):
    customer_code = serializers.CharField(read_only=True)

    class Meta:
        model = Customer
        fields = [
            "customer_id",
            "customer_code",
            "first_name",
            "last_name",
            "phone",
            "company_name",
            "email",
            "address",
            "lead_source_id",
            "assigned_employee_id",
        ]

    def validate(self, data):
        return data


class AddContactSerializer(serializers.ModelSerializer):
    customer_id = serializers.PrimaryKeyRelatedField(
        queryset=Customer.objects.all(),
        source="customer",
    )

    class Meta:
        model = Contact
        fields = [
            "customer_id",
            "contact_id",
            "name",
            "job_title",
            "phone",
            "email",
            "is_primary",
        ]
        read_only_fields = ["contact_id"]

    def validate(self, attrs):
        return super().validate(attrs)

    def create(self, validated_data):
        new_contact = Contact.objects.create(**validated_data)
        new_contact.save()
        return new_contact


class UpdateContactSerializer(serializers.ModelSerializer):
    contact_id = serializers.CharField(read_only=True)

    class Meta:
        model = Contact
        fields = [
            "customer_id",
            "contact_id",
            "name",
            "job_title",
            "phone",
            "email",
            "is_primary",
        ]

    def validate(self, data):
        return data


class InteractionRelationsMixin(serializers.Serializer):
    # contact and opportunity are optional: an interaction can be at company level
    # and not every interaction is tied to a deal
    contact_id = serializers.PrimaryKeyRelatedField(
        queryset=Contact.objects.all(),
        source="contact",
        required=False,
        allow_null=True,
    )
    opportunity_id = serializers.PrimaryKeyRelatedField(
        queryset=Opportunity.objects.all(),
        source="opportunity",
        required=False,
        allow_null=True,
    )

    def validate(self, attrs):
        instance = getattr(self, "instance", None)
        customer = attrs.get("customer", instance.customer if instance else None)
        contact = attrs.get("contact", instance.contact if instance else None)
        opportunity = attrs.get("opportunity", instance.opportunity if instance else None)

        if contact and contact.customer_id != customer.customer_id:
            raise serializers.ValidationError({"contact_id": "Contact does not belong to this customer."})
        if opportunity and opportunity.customer_id != customer.customer_id:
            raise serializers.ValidationError({"opportunity_id": "Opportunity does not belong to this customer."})
        return attrs


class AddInteractionSerializer(InteractionRelationsMixin, serializers.ModelSerializer):
    customer_id = serializers.PrimaryKeyRelatedField(
        queryset=Customer.objects.all(),
        source="customer",
    )
    employee_id = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(),
        source="employee",
    )

    class Meta:
        model = Interaction
        fields = [
            "interaction_id",
            "type",
            "subject",
            "description",
            "interaction_date",
            "customer_id",
            "employee_id",
            "contact_id",
            "opportunity_id"
        ]
        read_only_fields = ["interaction_id"]

    def create(self, validated_data):
        new_interaction = Interaction.objects.create(**validated_data)
        new_interaction.save()
        return new_interaction


class UpdateInteractionSerializer(InteractionRelationsMixin, serializers.ModelSerializer):
    interaction_id = serializers.CharField(read_only=True)
    customer_id = serializers.PrimaryKeyRelatedField(
        queryset=Customer.objects.all(),
        source="customer",
        required=False,
    )
    employee_id = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(),
        source="employee",
        required=False,
    )

    class Meta:
        model = Interaction
        fields = [
            "interaction_id",
            "type",
            "subject",
            "description",
            "interaction_date",
            "customer_id",
            "employee_id",
            "contact_id",
            "opportunity_id"
        ]
