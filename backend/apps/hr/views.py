
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.db.models import ProtectedError
from django.db import IntegrityError, transaction
from .models import SkillCategory, EmployeeSkill, Skill, Attendance
from ..pagination import StandardPagination
from ..helpers import calculate_attendance_metrics
from .serializers import (
    AddSkillCategorySerializer,
    UpdateSkillCategorySerializer,
    AddEmployeeSkillSerializer,
    UpdateEmployeeSkillSerializer,
    AddSkillSerializer,
    UpdateSkillSerializer,
    AddAttendanceSerializer,
    UpdateAttendanceSerializer
)

class SkillCategoryManagement(APIView):
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination
    def get(self, request):
        request_parameters = request.query_params

        allowed_filters = {
            "skill_category_id",
            "name",
        }

        filters = {
            field: value
            for field, value in request_parameters.items()
            if field in allowed_filters and value
        }

        try:
            categories = SkillCategory.objects.values(
                "skill_category_id",
                "name",
                "description",
            ).filter(**filters).order_by("skill_category_id")

            paginator = self.pagination_class()
            page = paginator.paginate_queryset(
                categories, request, view=self
            )

            return paginator.get_paginated_response(page)

        except Exception:
            return Response(
                {"error": "Invalid data entered."},
                status=status.HTTP_400_BAD_REQUEST,
            )


    def post(self, request):
        serializer = AddSkillCategorySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {"message": "Skill category added successfully."},
            status=status.HTTP_201_CREATED,
        )

    def patch(self, request):
        skill_category_id = request.data.get("skill_category_id")

        if not skill_category_id:
            return Response(
                {"error": "Skill category ID is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            category = SkillCategory.objects.get(
                skill_category_id=skill_category_id
            )
        except SkillCategory.DoesNotExist:
            return Response(
                {"error": "Skill category not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = UpdateSkillCategorySerializer(
            category,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {"message": "Skill category updated successfully."}
        )

    def delete(self, request):
        skill_category_id = request.data.get("skill_category_id")

        if not skill_category_id:
            return Response(
                {"error": "Skill category ID is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            category = SkillCategory.objects.get(
                skill_category_id=skill_category_id
            )
        except SkillCategory.DoesNotExist:
            return Response(
                {"error": "Skill category not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            category.delete()
        except ProtectedError:
            return Response(
                {
                    "error": "This category contains skills. "
                    "Delete or reassign its skills before deleting the category."
                },
                status=status.HTTP_409_CONFLICT,
            )

        return Response(
            {"message": "Skill category deleted successfully."}
        )



class SkillManagement(APIView):
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination
    
    def get(self, request):
        request_parameters = request.query_params

        allowed_filters = {
            "skill_id",
            "skill_category_id",
            "name",
        }

        filters = {
            field: value
            for field, value in request_parameters.items()
            if field in allowed_filters and value
        }

        try:
            skills = Skill.objects.values(
                "skill_id",
                "skill_category_id",
                "skill_category__name",
                "name",
            ).filter(**filters).order_by("skill_id")

            paginator = self.pagination_class()
            page = paginator.paginate_queryset(
                skills, request, view=self
            )

            return paginator.get_paginated_response(page)

        except Exception:
            return Response(
                {"error": "Invalid data entered."},
                status=status.HTTP_400_BAD_REQUEST,
            )


    def post(self, request):
        serializer = AddSkillSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {"message": "Skill added successfully."},
            status=status.HTTP_201_CREATED,
        )

    def patch(self, request):
        skill_id = request.data.get("skill_id")

        if not skill_id:
            return Response(
                {"error": "Skill ID is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            skill = Skill.objects.get(skill_id=skill_id)
        except Skill.DoesNotExist:
            return Response(
                {"error": "Skill not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = UpdateSkillSerializer(
            skill,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {"message": "Skill updated successfully."}
        )

    def delete(self, request):
        skill_id = request.data.get("skill_id")

        if not skill_id:
            return Response(
                {"error": "Skill ID is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            skill = Skill.objects.get(skill_id=skill_id)
        except Skill.DoesNotExist:
            return Response(
                {"error": "Skill not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            skill.delete()
        except ProtectedError:
            return Response(
                {
                    "error": "This skill is assigned to employees. "
                    "Remove or reassign employee skills before deleting it."
                },
                status=status.HTTP_409_CONFLICT,
            )

        return Response(
            {"message": "Skill deleted successfully."}
        )



class EmployeeSkillManagement(APIView):
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination
    def get(self, request):
        request_parameters = request.query_params

        allowed_filters = {
            "employee_skill_id",
            "employee_id",
            "skill_id",
            "level",
            "years_experience",
        }

        filters = {
            field: value
            for field, value in request_parameters.items()
            if field in allowed_filters and value
        }

        try:
            employee_skills = [
                {
                    **employee_skill,
                }
                for employee_skill in EmployeeSkill.objects.values(
                    "employee_skill_id",
                    "employee_id",
                    "skill_id",
                    "skill__name",
                    "skill__skill_category__name",
                    "level",
                    "years_experience",
                ).filter(**filters)
            ]
        except Exception:
            return Response(
                {"error": "Invalid data entered."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({"EmployeeSkills": employee_skills})

    def post(self, request):
        serializer = AddEmployeeSkillSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {"message": "Employee skill added successfully."},
            status=status.HTTP_201_CREATED,
        )

    def patch(self, request):
        employee_skill_id = request.data.get("employee_skill_id")

        if not employee_skill_id:
            return Response(
                {"error": "Employee skill ID is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            employee_skill = EmployeeSkill.objects.get(
                employee_skill_id=employee_skill_id
            )
        except EmployeeSkill.DoesNotExist:
            return Response(
                {"error": "Employee skill not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = UpdateEmployeeSkillSerializer(
            employee_skill,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {"message": "Employee skill updated successfully."}
        )

    def delete(self, request):
        employee_skill_id = request.data.get("employee_skill_id")

        if not employee_skill_id:
            return Response(
                {"error": "Employee skill ID is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            employee_skill = EmployeeSkill.objects.get(
                employee_skill_id=employee_skill_id
            )
        except EmployeeSkill.DoesNotExist:
            return Response(
                {"error": "Employee skill not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            employee_skill.delete()
        except ProtectedError:
            return Response(
                {"error": "Unable to delete employee skill."},
                status=status.HTTP_409_CONFLICT,
            )

        return Response(
            {"message": "Employee skill deleted successfully."}
        )

class AttendanceManagement(APIView):
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination

    def get(self, request):
        request_parameters = request.query_params

        allowed_filters = {
            "attendance_id",
            "employee_id",
            "attendance_date",
            "status",
        }

        filters = {
            key: value
            for key, value in request_parameters.items()
            if key in allowed_filters
        }

        queryset = (
            Attendance.objects
            .filter(**filters)
            .order_by("-attendance_date", "attendance_id")
            .values(
                "attendance_id",
                "employee_id",
                "attendance_date",
                "check_in",
                "check_out",
                "worked_minutes",
                "overtime_minutes",
                "status",
                "notes",
            )
        )

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(
            queryset,
            request,
            view=self
        )

        return paginator.get_paginated_response(page)

    def post(self, request):
        serializer = AddAttendanceSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            with transaction.atomic():
                attendance = serializer.save()

                calculate_attendance_metrics(attendance)

                attendance.save(update_fields=[
                    "worked_minutes",
                    "overtime_minutes",
                ])

            return Response(
                {
                    "message": "Attendance created successfully.",
                    "attendance_id": attendance.attendance_id,
                    "worked_minutes": attendance.worked_minutes,
                    "overtime_minutes": attendance.overtime_minutes,
                },
                status=status.HTTP_201_CREATED
            )

        except IntegrityError:
            return Response(
                {
                    "message": (
                        "Attendance already exists for this employee "
                        "on this date, or another database constraint "
                        "was violated."
                    )
                },
                status=status.HTTP_409_CONFLICT
            )

    def patch(self, request):
        attendance_id = request.data.get("attendance_id")

        if not attendance_id:
            return Response(
                {"message": "attendance_id is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            attendance = Attendance.objects.get(
                attendance_id=attendance_id
            )
        except Attendance.DoesNotExist:
            return Response(
                {"message": "Attendance not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = UpdateAttendanceSerializer(
            attendance,
            data=request.data,
            partial=True
        )

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            with transaction.atomic():
                attendance = serializer.save()

                calculate_attendance_metrics(attendance)

                attendance.save(update_fields=[
                    "worked_minutes",
                    "overtime_minutes",
                ])

            return Response(
                {
                    "message": "Attendance updated successfully.",
                    "attendance_id": attendance.attendance_id,
                    "worked_minutes": attendance.worked_minutes,
                    "overtime_minutes": attendance.overtime_minutes,
                },
                status=status.HTTP_200_OK
            )

        except IntegrityError:
            return Response(
                {
                    "message": (
                        "The updated attendance conflicts with an "
                        "existing record or another database constraint."
                    )
                },
                status=status.HTTP_409_CONFLICT
            )

    def delete(self, request):
        attendance_id = request.data.get("attendance_id")

        if not attendance_id:
            return Response(
                {"message": "attendance_id is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            attendance = Attendance.objects.get(
                attendance_id=attendance_id
            )
        except Attendance.DoesNotExist:
            return Response(
                {"message": "Attendance not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        attendance.delete()

        return Response(
            {"message": "Attendance deleted successfully."},
            status=status.HTTP_200_OK
        )
