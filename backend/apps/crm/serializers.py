from rest_framework import serializers
from .models import Customer, Contact, Interaction, Opportunity, CustomerNote, LeadSource
from apps.accounts.models import Employee
from apps.helpers import generate_code


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
    probability = serializers.IntegerField(
        min_value=0,
        max_value=100,
        required=False,
        default=0,
    )
    expected_close_date = serializers.DateField(
        required=False,
        allow_null=True,
    )
    stage = serializers.CharField(
        required=False,
        default=Opportunity.Stage.LEAD,
    )
    status = serializers.CharField(
        required=False,
        default=Opportunity.Status.OPEN,
    )

    class Meta:
        model = Opportunity
        fields = [
            "opportunity_id",
            "title",
            "estimated_value",
            "stage",
            "probability",
            "expected_close_date",
            "status",
            "customer_id",
            "employee_id",
            "customer",
            "employee",
            "customer_details",
            "employee_details",
        ]
        read_only_fields = ["opportunity_id", "customer", "employee"]

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
        if data.get("estimated_value") == "" or data.get("estimated_value") is None:
            data["estimated_value"] = 0
        if data.get("probability") == "" or data.get("probability") is None:
            data["probability"] = 0

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


class AddCustomerSerializer(serializers.ModelSerializer):
    lead_source_id = serializers.PrimaryKeyRelatedField(
        queryset=LeadSource.objects.all(),
        source="lead_source",
    )
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
        ]

    def validate(self, attrs):
        return super().validate(attrs)

    def create(self, validated_data):
        customer_code = generate_code(account_type=2)
        new_customer = Customer.objects.create(**validated_data, customer_code=customer_code)
        new_customer.save()
        return new_customer


class UpdateCustomerSerializer(serializers.ModelSerializer):
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


class AddInteractionSerializer(serializers.ModelSerializer):
    customer_id = serializers.PrimaryKeyRelatedField(
        queryset=Customer.objects.all(),
        source="customer",
    )
    employee_id = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(),
        source="employee",
    )

    contact_id = serializers.PrimaryKeyRelatedField(
        queryset=Contact.objects.all(),
        source="contact",
    )
    
    opportunity_id = serializers.PrimaryKeyRelatedField(
        queryset=Opportunity.objects.all(),
        source="opportunity",
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

    def validate(self, attrs):
        return super().validate(attrs)

    def create(self, validated_data):
        new_interaction = Interaction.objects.create(**validated_data)
        new_interaction.save()
        return new_interaction


class UpdateInteractionSerializer(serializers.ModelSerializer):
    interaction_id = serializers.CharField(read_only=True)

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

    def validate(self, data):
        return data

class AddLeadSourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeadSource
        fields = [
            "name",
            "description",
            "is_active",
        ]


class UpdateLeadSourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeadSource
        fields = [
            "source_id",
            "name",
            "description",
            "is_active",
        ]
        read_only_fields = ["source_id"]