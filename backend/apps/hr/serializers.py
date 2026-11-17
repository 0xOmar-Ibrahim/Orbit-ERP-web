
from rest_framework import serializers
from .models import SkillCategory, Skill, EmployeeSkill, Attendance
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
