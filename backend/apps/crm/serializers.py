from rest_framework import serializers
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