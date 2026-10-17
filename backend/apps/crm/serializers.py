from rest_framework import serializers
<<<<<<< HEAD
from .models import Opportunity, Customer
from apps.accounts.models import Employee


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = "__all__"


class OpportunitySerializer(serializers.ModelSerializer):
    customer_details = serializers.SerializerMethodField(read_only=True)
    employee_details = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Opportunity
        fields = [
            "opportunity_id",
            "customer",
            "customer_details",
            "employee",
            "employee_details",
            "title",
            "estimated_value",
            "stage",
            "probability",
            "expected_close_date",
            "status",
        ]
        read_only_fields = ["opportunity_id"]

    def get_customer_details(self, obj):
        if obj.customer:
            return {
                "customer_id": obj.customer.customer_id,
                "customer_code": obj.customer.customer_code,
                "name": f"{obj.customer.first_name} {obj.customer.last_name}".strip(),
                "company_name": obj.customer.company_name,
                "email": obj.customer.email,
                "phone": obj.customer.phone,
            }
        return None

    def get_employee_details(self, obj):
        if obj.employee:
            return {
                "employee_id": obj.employee.employee_id,
                "employee_code": obj.employee.employee_code,
                "name": f"{obj.employee.first_name} {obj.employee.last_name}".strip(),
                "work_email": obj.employee.work_email,
            }
        return None

    def to_internal_value(self, data):
        # Support customer_id and employee_id field aliases
        data = data.copy() if hasattr(data, "copy") else dict(data)
        if "customer_id" in data and "customer" not in data:
            data["customer"] = data["customer_id"]
        if "employee_id" in data and "employee" not in data:
            data["employee"] = data["employee_id"]
        return super().to_internal_value(data)

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep["customer_id"] = instance.customer_id
        rep["employee_id"] = instance.employee_id
        return rep
=======
from .models import Customer, Contact, Interaction
from ..accounts.models import Employee
from rest_framework import serializers
from ..helpers import generate_code

class AddCustomerSerializer(serializers.ModelSerializer):
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
            "campaign"
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
            "campaign"
        ]

        def validate(self, data):
            return data


class AddContactSerializer(serializers.ModelSerializer):
    customer_id = serializers.PrimaryKeyRelatedField(
        queryset=Customer.objects.all(),
        source="customer"
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
            "is_primary"
        ]

        def validate(self, data):
            return data


class AddInteractionSerializer(serializers.ModelSerializer):
    customer_id = serializers.PrimaryKeyRelatedField(
        queryset=Customer.objects.all(),
        source="customer"
    )

    employee_id = serializers.PrimaryKeyRelatedField(
            queryset=Employee.objects.all(),
            source="employee"
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
            "employee_id"
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
            "employee_id"
    ]

        def validate(self, data):
            return data


class AddContactSerializer(serializers.ModelSerializer):
    customer_id = serializers.PrimaryKeyRelatedField(
        queryset=Customer.objects.all(),
        source="customer"
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
            "is_primary"
        ]

        def validate(self, data):
            return data


class AddInteractionSerializer(serializers.ModelSerializer):
    customer_id = serializers.PrimaryKeyRelatedField(
        queryset=Customer.objects.all(),
        source="customer"
    )

    employee_id = serializers.PrimaryKeyRelatedField(
            queryset=Employee.objects.all(),
            source="employee"
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
            "employee_id"
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
            "employee_id"
    ]

        def validate(self, data):
            return data
>>>>>>> a65377644c2a263c042002c614d8843bee6eaad6
