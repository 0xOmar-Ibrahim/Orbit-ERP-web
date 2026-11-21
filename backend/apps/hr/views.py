
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.db.models import ProtectedError, Q
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from .models import SkillCategory, EmployeeSkill, Skill, Attendance, EmploymentContract
from ..pagination import StandardPagination
from ..helpers import calculate_attendance_metrics, is_valid_id
from .serializers import (
    AddSkillCategorySerializer,
    UpdateSkillCategorySerializer,
    AddEmployeeSkillSerializer,
    UpdateEmployeeSkillSerializer,
    AddSkillSerializer,
    UpdateSkillSerializer,
    AddAttendanceSerializer,
    UpdateAttendanceSerializer,
    AddEmploymentContractSerializer,
    UpdateEmploymentContractSerializer,
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


class EmploymentContractManagement(APIView):
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination

    CONTRACT_VALUES = (
        "contract_id",
        "contract_number",
        "employee_id",
        "employee__first_name",
        "employee__last_name",
        "contract_type",
        "start_date",
        "end_date",
        "position_id",
        "position__title",
        "schedule_id",
        "schedule__name",
        "wage",
        "currency",
        "status",
        "created_at",
        "updated_at",
    )

    def _get_contract_id(self, request):
        return (
            request.data.get("contract_id")
            or request.query_params.get("contract_id")
        )

    def get(self, request):
        request_parameters = request.query_params
        contract_id = request_parameters.get("contract_id")

        # Get a specific contract by ID
        if contract_id:
            if not is_valid_id(contract_id):
                return Response(
                    {"error": "contract_id must be an integer."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            contract = (
                EmploymentContract.objects
                .filter(contract_id=contract_id)
                .values(*self.CONTRACT_VALUES)
                .first()
            )

            if not contract:
                return Response(
                    {"error": "Contract not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            return Response({"contract": contract})

        # Exact-match filters
        allowed_filters = {
            "contract_number",
            "employee_id",
            "contract_type",
            "status",
            "position_id",
            "schedule_id",
            "currency",
        }

        filters = {
            field: value
            for field, value in request_parameters.items()
            if field in allowed_filters and value
        }

        # Date range filters
        range_filters = {
            "start_date_from": "start_date__gte",
            "start_date_to": "start_date__lte",
            "end_date_from": "end_date__gte",
            "end_date_to": "end_date__lte",
        }

        for param, lookup in range_filters.items():
            value = request_parameters.get(param)
            if value:
                filters[lookup] = value

        try:
            queryset = EmploymentContract.objects.filter(**filters)

            # Partial, case-insensitive search. Every word must match the
            # contract number, employee name or position title.
            search = request_parameters.get("search", "").strip()
            for term in search.split():
                queryset = queryset.filter(
                    Q(contract_number__icontains=term)
                    | Q(employee__first_name__icontains=term)
                    | Q(employee__last_name__icontains=term)
                    | Q(position__title__icontains=term)
                )

            contracts = (
                queryset
                .order_by("-start_date", "contract_id")
                .values(*self.CONTRACT_VALUES)
            )

            paginator = self.pagination_class()
            page = paginator.paginate_queryset(
                contracts, request, view=self
            )

            return paginator.get_paginated_response(page)

        except (ValueError, TypeError, DjangoValidationError):
            return Response(
                {"error": "Invalid data entered."},
                status=status.HTTP_400_BAD_REQUEST,
            )

    def post(self, request):
        serializer = AddEmploymentContractSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            with transaction.atomic():
                contract = serializer.save()
        except IntegrityError:
            return Response(
                {
                    "error": (
                        "This employee already has a running contract, "
                        "or another database constraint was violated."
                    )
                },
                status=status.HTTP_409_CONFLICT,
            )

        return Response(
            {
                "message": "Contract created successfully.",
                "contract_id": contract.contract_id,
            },
            status=status.HTTP_201_CREATED,
        )

    def patch(self, request):
        contract_id = self._get_contract_id(request)

        if not contract_id:
            return Response(
                {"error": "contract_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not is_valid_id(contract_id):
            return Response(
                {"error": "contract_id must be an integer."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            contract = EmploymentContract.objects.get(contract_id=contract_id)
        except EmploymentContract.DoesNotExist:
            return Response(
                {"error": "Contract not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = UpdateEmploymentContractSerializer(
            contract,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)

        try:
            with transaction.atomic():
                serializer.save()
        except IntegrityError:
            return Response(
                {
                    "error": (
                        "This employee already has a running contract, "
                        "or another database constraint was violated."
                    )
                },
                status=status.HTTP_409_CONFLICT,
            )

        return Response(
            {"message": "Contract updated successfully."}
        )

    def delete(self, request):
        contract_id = self._get_contract_id(request)

        if not contract_id:
            return Response(
                {"error": "contract_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not is_valid_id(contract_id):
            return Response(
                {"error": "contract_id must be an integer."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            contract = EmploymentContract.objects.get(contract_id=contract_id)
        except EmploymentContract.DoesNotExist:
            return Response(
                {"error": "Contract not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            contract.delete()
        except ProtectedError:
            return Response(
                {"error": "This contract is referenced by other records and cannot be deleted."},
                status=status.HTTP_409_CONFLICT,
            )

        return Response(
            {"message": "Contract deleted successfully."}
        )
