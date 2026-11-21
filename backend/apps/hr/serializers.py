
from rest_framework import serializers
from .models import (
    SkillCategory,
    Skill,
    EmployeeSkill,
    Attendance,
    EmploymentContract,
    JobPosition,
    WorkSchedule,
)
from apps.accounts.models import Employee


# ==========================
# Skill Category Serializers
# ==========================

class AddSkillCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SkillCategory
        fields = ["name", "description"]


class UpdateSkillCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SkillCategory
        fields = ["name", "description"]


# ==========================
# Skill Serializers
# ==========================

class AddSkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = ["skill_category", "name"]


class UpdateSkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = ["skill_category", "name"]


# ==========================
# Employee Skill Serializers
# ==========================

class AddEmployeeSkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeSkill
        fields = [
            "employee",
            "skill",
            "level",
            "years_experience",
        ]


class UpdateEmployeeSkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeSkill
        fields = [
            "employee",
            "skill",
            "level",
            "years_experience",
        ]

class AddAttendanceSerializer(serializers.ModelSerializer):
    employee_id = serializers.PrimaryKeyRelatedField(
        source="employee",
        queryset=Employee.objects.all()
    )

    class Meta:
        model = Attendance
        fields = [
            "employee_id",
            "attendance_date",
            "check_in",
            "check_out",
            "status",
            "notes",
        ]

    def validate(self, attrs):
        check_in = attrs.get("check_in")
        check_out = attrs.get("check_out")

        if check_in and check_out and check_out <= check_in:
            raise serializers.ValidationError({
                "check_out": "Check-out must be later than check-in."
            })

        return attrs


class UpdateAttendanceSerializer(serializers.ModelSerializer):
    employee_id = serializers.PrimaryKeyRelatedField(
        source="employee",
        queryset=Employee.objects.all(),
        required=False
    )

    class Meta:
        model = Attendance
        fields = [
            "employee_id",
            "attendance_date",
            "check_in",
            "check_out",
            "status",
            "notes",
        ]

    def validate(self, attrs):
        check_in = attrs.get(
            "check_in",
            self.instance.check_in
        )
        check_out = attrs.get(
            "check_out",
            self.instance.check_out
        )

        if check_in and check_out and check_out <= check_in:
            raise serializers.ValidationError({
                "check_out": "Check-out must be later than check-in."
            })

        return attrs


# ================================
# Employment Contract Serializers
# ================================

CONTRACT_FIELDS = [
    "contract_number",
    "employee_id",
    "contract_type",
    "start_date",
    "end_date",
    "position_id",
    "schedule_id",
    "wage",
    "currency",
    "status",
]


def validate_contract_values(start_date, end_date, wage):
    errors = {}

    # Mirrors the chk_contract_date_order DB constraint
    if start_date and end_date and end_date <= start_date:
        errors["end_date"] = "End date must be later than start date."

    if wage is not None and wage < 0:
        errors["wage"] = "Wage cannot be negative."

    if errors:
        raise serializers.ValidationError(errors)


class AddEmploymentContractSerializer(serializers.ModelSerializer):
    employee_id = serializers.PrimaryKeyRelatedField(
        source="employee",
        queryset=Employee.objects.all()
    )
    position_id = serializers.PrimaryKeyRelatedField(
        source="position",
        queryset=JobPosition.objects.all(),
        required=False,
        allow_null=True
    )
    schedule_id = serializers.PrimaryKeyRelatedField(
        source="schedule",
        queryset=WorkSchedule.objects.all(),
        required=False,
        allow_null=True
    )

    class Meta:
        model = EmploymentContract
        fields = CONTRACT_FIELDS

    def validate(self, attrs):
        validate_contract_values(
            attrs.get("start_date"),
            attrs.get("end_date"),
            attrs.get("wage"),
        )
        return attrs


class UpdateEmploymentContractSerializer(serializers.ModelSerializer):
    employee_id = serializers.PrimaryKeyRelatedField(
        source="employee",
        queryset=Employee.objects.all(),
        required=False
    )
    position_id = serializers.PrimaryKeyRelatedField(
        source="position",
        queryset=JobPosition.objects.all(),
        required=False,
        allow_null=True
    )
    schedule_id = serializers.PrimaryKeyRelatedField(
        source="schedule",
        queryset=WorkSchedule.objects.all(),
        required=False,
        allow_null=True
    )

    class Meta:
        model = EmploymentContract
        fields = CONTRACT_FIELDS

    def validate(self, attrs):
        validate_contract_values(
            attrs.get("start_date", self.instance.start_date),
            attrs.get("end_date", self.instance.end_date),
            attrs.get("wage"),
        )
        return attrs
