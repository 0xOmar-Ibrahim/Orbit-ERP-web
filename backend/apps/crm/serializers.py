from rest_framework import serializers
from .models import Customer
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