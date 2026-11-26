import os
import datetime
from decimal import Decimal
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
from rest_framework.exceptions import (
    NotFound,
    PermissionDenied,
    ValidationError as DRFValidationError,
)
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.utils import timezone
from apps.accounts.models import Employee
from django.db.models import ProtectedError, Q, Count
from django.core.exceptions import (
    ValidationError as DjangoValidationError,
    SuspiciousFileOperation,
)
from django.http import FileResponse
from django.urls import reverse
from django.db import IntegrityError, transaction
from .models import (
    SkillCategory,
    EmployeeSkill,
    Skill,
    Attendance,
    EmploymentContract,
    EmployeeDocument,
    EmployeeHistory,
    WorkSchedule,
    PublicHoliday,
    LeaveType,
    LeaveRequest,
)
from . import leave as leave_logic
from .leave import project_to_year
from .history import log_salary_change
from ..pagination import StandardPagination
from ..helpers import (
    calculate_attendance_metrics,
    is_valid_id,
    get_upload_storage,
    delete_stored_file
)
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
    AddEmployeeDocumentSerializer,
    UpdateEmployeeDocumentSerializer,
    AddWorkScheduleSerializer,
    UpdateWorkScheduleSerializer,
    AddPublicHolidaySerializer,
    UpdatePublicHolidaySerializer,
    AddLeaveRequestSerializer,
    UpdateLeaveRequestSerializer,
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
        allowed_filters = {
            "employee_skill_id",
            "employee_id",
            "skill_id",
            "level",
            "years_experience",
        }

        filters = {
            field: value
            for field, value in request.query_params.items()
            if field in allowed_filters and value
        }

        try:
            employee_skills = EmployeeSkill.objects.values(
                "employee_skill_id",
                "employee_id",
                "skill_id",
                "skill__name",
                "skill__skill_category__name",
                "level",
                "years_experience",
            ).filter(**filters)

        except Exception:
            return Response(
                {"error": "Invalid data entered."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        paginator = self.pagination_class()
        paginated_queryset = paginator.paginate_queryset(
            employee_skills, request, view=self
        )

        return paginator.get_paginated_response(paginated_queryset)


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
            if key in allowed_filters and value
        }

        # Date range filters
        range_filters = {
            "attendance_date_from": "attendance_date__gte",
            "attendance_date_to": "attendance_date__lte",
        }

        for param, lookup in range_filters.items():
            value = request_parameters.get(param)
            if value:
                filters[lookup] = value

        try:
            queryset = Attendance.objects.filter(**filters)

            # Partial, case-insensitive search. Every word must match the
            # employee's first name, last name or code.
            search = request_parameters.get("search", "").strip()
            for term in search.split():
                queryset = queryset.filter(
                    Q(employee__first_name__icontains=term)
                    | Q(employee__last_name__icontains=term)
                    | Q(employee__employee_code__icontains=term)
                )

            queryset = (
                queryset
                .order_by("-attendance_date", "attendance_id")
                .values(
                    "attendance_id",
                    "employee_id",
                    "employee__first_name",
                    "employee__last_name",
                    "employee__employee_code",
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

        except (ValueError, TypeError, DjangoValidationError):
            return Response(
                {"error": "Invalid data entered."},
                status=status.HTTP_400_BAD_REQUEST,
            )

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
                "contract_number": contract.contract_number,
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
        old_wage = contract.wage

        try:
            # Save the update and its salary history row together
            with transaction.atomic():
                contract = serializer.save()
                log_salary_change(contract, old_wage, recorded_by=request.user)
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


class EmployeeDocumentManagement(APIView):
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination
    # multipart/form-data for uploads, JSON for metadata-only edits and deletes
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    DOCUMENT_VALUES = (
        "document_id",
        "employee_id",
        "employee__first_name",
        "employee__last_name",
        "document_type",
        "document_name",
        "file_path",
        "expiry_date",
        "uploaded_by_id",
        "uploaded_by__first_name",
        "uploaded_by__last_name",
        "uploaded_at",
    )

    def _get_document_id(self, request):
        return (
            request.data.get("document_id")
            or request.query_params.get("document_id")
        )

    def _with_download_url(self, request, document):
        document["download_url"] = request.build_absolute_uri(
            reverse("documents-download")
            + f"?document_id={document['document_id']}"
        )
        return document

    def get(self, request):
        request_parameters = request.query_params
        document_id = request_parameters.get("document_id")

        # Get a specific document by ID
        if document_id:
            if not is_valid_id(document_id):
                return Response(
                    {"error": "document_id must be an integer."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            document = (
                EmployeeDocument.objects
                .filter(document_id=document_id)
                .values(*self.DOCUMENT_VALUES)
                .first()
            )

            if not document:
                return Response(
                    {"error": "Document not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            return Response(
                {"document": self._with_download_url(request, document)}
            )

        # Exact-match filters
        allowed_filters = {
            "employee_id",
            "document_type",
            "uploaded_by_id",
        }

        filters = {
            field: value
            for field, value in request_parameters.items()
            if field in allowed_filters and value
        }

        # Expiry date range filters
        range_filters = {
            "expiry_date_from": "expiry_date__gte",
            "expiry_date_to": "expiry_date__lte",
        }

        for param, lookup in range_filters.items():
            value = request_parameters.get(param)
            if value:
                filters[lookup] = value

        try:
            queryset = EmployeeDocument.objects.filter(**filters)

            # Partial, case-insensitive search. Every word must match the
            # document name or the employee's name.
            search = request_parameters.get("search", "").strip()
            for term in search.split():
                queryset = queryset.filter(
                    Q(document_name__icontains=term)
                    | Q(employee__first_name__icontains=term)
                    | Q(employee__last_name__icontains=term)
                )

            documents = (
                queryset
                .order_by("-uploaded_at", "document_id")
                .values(*self.DOCUMENT_VALUES)
            )

            paginator = self.pagination_class()
            page = paginator.paginate_queryset(
                documents, request, view=self
            )
            page = [
                self._with_download_url(request, document)
                for document in page
            ]

            return paginator.get_paginated_response(page)

        except (ValueError, TypeError, DjangoValidationError):
            return Response(
                {"error": "Invalid data entered."},
                status=status.HTTP_400_BAD_REQUEST,
            )

    def post(self, request):
        serializer = AddEmployeeDocumentSerializer(
            data=request.data,
            context={"uploaded_by": request.user},
        )
        serializer.is_valid(raise_exception=True)
        document = serializer.save()

        return Response(
            {
                "message": "Document uploaded successfully.",
                "document_id": document.document_id,
                "file_path": document.file_path,
            },
            status=status.HTTP_201_CREATED,
        )

    def patch(self, request):
        document_id = self._get_document_id(request)

        if not document_id:
            return Response(
                {"error": "document_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not is_valid_id(document_id):
            return Response(
                {"error": "document_id must be an integer."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            document = EmployeeDocument.objects.get(document_id=document_id)
        except EmployeeDocument.DoesNotExist:
            return Response(
                {"error": "Document not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = UpdateEmployeeDocumentSerializer(
            document,
            data=request.data,
            partial=True,
            context={"uploaded_by": request.user},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {"message": "Document updated successfully."}
        )

    def delete(self, request):
        document_id = self._get_document_id(request)

        if not document_id:
            return Response(
                {"error": "document_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not is_valid_id(document_id):
            return Response(
                {"error": "document_id must be an integer."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            document = EmployeeDocument.objects.get(document_id=document_id)
        except EmployeeDocument.DoesNotExist:
            return Response(
                {"error": "Document not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        file_path = document.file_path
        document.delete()
        # Remove the file only after the row is gone
        delete_stored_file(file_path)

        return Response(
            {"message": "Document deleted successfully."}
        )


class EmployeeDocumentDownload(APIView):
    """Streams a stored employee document to authenticated users."""
    permission_classes = [AllowAny]

    def get(self, request):
        # Allow authentication via query param ?token=... or standard Authorization header
        token = request.query_params.get("token")
        if token:
            try:
                jwt_auth = JWTAuthentication()
                validated_token = jwt_auth.get_validated_token(token)
                request.user = jwt_auth.get_user(validated_token)
            except Exception:
                return Response(
                    {"error": "Invalid or expired token."},
                    status=status.HTTP_401_UNAUTHORIZED
                )
        elif not request.user or not request.user.is_authenticated:
            return Response(
                {"error": "Authentication credentials were not provided."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        document_id = request.query_params.get("document_id")

        if not document_id:
            return Response(
                {"error": "document_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not is_valid_id(document_id):
            return Response(
                {"error": "document_id must be an integer."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            document = EmployeeDocument.objects.get(document_id=document_id)
        except EmployeeDocument.DoesNotExist:
            return Response(
                {"error": "Document not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        storage = get_upload_storage()

        try:
            if not document.file_path or not storage.exists(document.file_path):
                raise FileNotFoundError
            stored_file = storage.open(document.file_path, "rb")
        except (FileNotFoundError, SuspiciousFileOperation):
            return Response(
                {"error": "The file for this document is missing on the server."},
                status=status.HTTP_404_NOT_FOUND,
            )

        extension = os.path.splitext(document.file_path)[1]
        download_name = f"{document.document_name}{extension}"
        inline = request.query_params.get("inline") in ("1", "true")

        return FileResponse(
            stored_file,
            as_attachment=not inline,
            filename=download_name,
        )


class EmployeeHistoryView(APIView):
    """
    Read-only career history. Rows are written automatically when an employee's
    position/department/branch/status/type/manager or a contract's wage changes
    (see apps/hr/history.py). POST/PATCH/DELETE are not allowed (405).
    """
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination

    HISTORY_VALUES = (
        "history_id",
        "employee_id",
        "employee__first_name",
        "employee__last_name",
        "employee__employee_code",
        "change_type",
        "old_value",
        "new_value",
        "notes",
        "change_date",
        "recorded_by_id",
        "recorded_by__first_name",
        "recorded_by__last_name",
        "created_at",
    )

    def get(self, request):
        request_parameters = request.query_params
        history_id = request_parameters.get("history_id")

        # Get a specific history entry by ID
        if history_id:
            if not is_valid_id(history_id):
                return Response(
                    {"error": "history_id must be an integer."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            history = (
                EmployeeHistory.objects
                .filter(history_id=history_id)
                .values(*self.HISTORY_VALUES)
                .first()
            )

            if not history:
                return Response(
                    {"error": "History entry not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            return Response({"history": history})

        # Exact-match filters
        allowed_filters = {
            "employee_id",
            "change_type",
            "recorded_by_id",
        }

        filters = {
            field: value
            for field, value in request_parameters.items()
            if field in allowed_filters and value
        }

        # Change date range filters
        range_filters = {
            "change_date_from": "change_date__gte",
            "change_date_to": "change_date__lte",
        }

        for param, lookup in range_filters.items():
            value = request_parameters.get(param)
            if value:
                filters[lookup] = value

        try:
            queryset = EmployeeHistory.objects.filter(**filters)

            # Partial, case-insensitive search. Every word must match the
            # old/new value, the notes or the employee's name.
            search = request_parameters.get("search", "").strip()
            for term in search.split():
                queryset = queryset.filter(
                    Q(old_value__icontains=term)
                    | Q(new_value__icontains=term)
                    | Q(notes__icontains=term)
                    | Q(employee__first_name__icontains=term)
                    | Q(employee__last_name__icontains=term)
                )

            history = (
                queryset
                .order_by("-change_date", "-created_at")
                .values(*self.HISTORY_VALUES)
            )

            paginator = self.pagination_class()
            page = paginator.paginate_queryset(
                history, request, view=self
            )

            return paginator.get_paginated_response(page)

        except (ValueError, TypeError, DjangoValidationError):
            return Response(
                {"error": "Invalid data entered."},
                status=status.HTTP_400_BAD_REQUEST,
            )


def _parse_bool(value):
    """'true'/'1'/'yes' -> True, 'false'/'0'/'no' -> False, anything else -> ValueError."""
    normalized = str(value).strip().lower()
    if normalized in ("true", "1", "yes"):
        return True
    if normalized in ("false", "0", "no"):
        return False
    raise ValueError("Invalid boolean.")


class WorkScheduleManagement(APIView):
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination

    def _get_schedule_id(self, request):
        return (
            request.data.get("schedule_id")
            or request.query_params.get("schedule_id")
        )

    def _queryset(self):
        return (
            WorkSchedule.objects
            .prefetch_related("lines")
            .annotate(
                employee_count=Count("employees", distinct=True),
                contract_count=Count("contracts", distinct=True),
            )
        )

    def _serialize(self, schedule):
        # Sunday first, Saturday last (weekday values: Saturday=0 ... Friday=6)
        lines = sorted(schedule.lines.all(), key=lambda line: (line.weekday - 1) % 7)

        return {
            "schedule_id": schedule.schedule_id,
            "name": schedule.name,
            "timezone_name": schedule.timezone_name,
            "hours_per_week": schedule.hours_per_week,
            "active": schedule.active,
            "employee_count": schedule.employee_count,
            "contract_count": schedule.contract_count,
            "lines": [
                {
                    "line_id": line.line_id,
                    "weekday": line.weekday,
                    "weekday_label": line.get_weekday_display(),
                    "start_time": line.start_time,
                    "end_time": line.end_time,
                    "break_minutes": line.break_minutes,
                }
                for line in lines
            ],
        }

    def get(self, request):
        request_parameters = request.query_params
        schedule_id = request_parameters.get("schedule_id")

        # Get a specific schedule by ID
        if schedule_id:
            if not is_valid_id(schedule_id):
                return Response(
                    {"error": "schedule_id must be an integer."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            schedule = self._queryset().filter(schedule_id=schedule_id).first()

            if not schedule:
                return Response(
                    {"error": "Work schedule not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            return Response({"schedule": self._serialize(schedule)})

        try:
            queryset = self._queryset()

            active = request_parameters.get("active")
            if active:
                queryset = queryset.filter(active=_parse_bool(active))

            search = request_parameters.get("search", "").strip()
            for term in search.split():
                queryset = queryset.filter(name__icontains=term)

            queryset = queryset.order_by("name", "schedule_id")

            paginator = self.pagination_class()
            page = paginator.paginate_queryset(queryset, request, view=self)

            return paginator.get_paginated_response(
                [self._serialize(schedule) for schedule in page]
            )

        except (ValueError, TypeError, DjangoValidationError):
            return Response(
                {"error": "Invalid data entered."},
                status=status.HTTP_400_BAD_REQUEST,
            )

    def post(self, request):
        serializer = AddWorkScheduleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            schedule = serializer.save()
        except IntegrityError:
            return Response(
                {"error": "The schedule conflicts with an existing record or a database constraint."},
                status=status.HTTP_409_CONFLICT,
            )

        return Response(
            {
                "message": "Work schedule created successfully.",
                "schedule_id": schedule.schedule_id,
            },
            status=status.HTTP_201_CREATED,
        )

    def patch(self, request):
        schedule_id = self._get_schedule_id(request)

        if not schedule_id:
            return Response(
                {"error": "schedule_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not is_valid_id(schedule_id):
            return Response(
                {"error": "schedule_id must be an integer."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            schedule = WorkSchedule.objects.get(schedule_id=schedule_id)
        except WorkSchedule.DoesNotExist:
            return Response(
                {"error": "Work schedule not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = UpdateWorkScheduleSerializer(
            schedule,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)

        try:
            serializer.save()
        except IntegrityError:
            return Response(
                {"error": "The schedule conflicts with an existing record or a database constraint."},
                status=status.HTTP_409_CONFLICT,
            )

        return Response(
            {"message": "Work schedule updated successfully."}
        )

    def delete(self, request):
        schedule_id = self._get_schedule_id(request)

        if not schedule_id:
            return Response(
                {"error": "schedule_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not is_valid_id(schedule_id):
            return Response(
                {"error": "schedule_id must be an integer."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        schedule = self._queryset().filter(schedule_id=schedule_id).first()

        if not schedule:
            return Response(
                {"error": "Work schedule not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Deleting would silently unassign employees/contracts (SET_NULL)
        # and break overtime calculation, so block it while in use.
        if schedule.employee_count or schedule.contract_count:
            return Response(
                {
                    "error": (
                        "This schedule is still in use. Reassign its employees and "
                        "contracts, or set active=false instead of deleting it."
                    ),
                    "employee_count": schedule.employee_count,
                    "contract_count": schedule.contract_count,
                },
                status=status.HTTP_409_CONFLICT,
            )

        schedule.delete()

        return Response(
            {"message": "Work schedule deleted successfully."}
        )


class PublicHolidayManagement(APIView):
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination

    HOLIDAY_VALUES = ("holiday_id", "name", "date", "is_recurring")

    def _get_holiday_id(self, request):
        return (
            request.data.get("holiday_id")
            or request.query_params.get("holiday_id")
        )

    def _holidays_for_year(self, queryset, year):
        """
        Holidays that fall in `year`: one-off holidays dated in that year, plus every
        recurring holiday moved to that year (Feb 29 -> Feb 28 in non-leap years).
        """
        holidays = []

        for holiday in queryset.filter(Q(is_recurring=True) | Q(date__year=year)).values(*self.HOLIDAY_VALUES):
            holiday_date = holiday["date"]

            if holiday["is_recurring"]:
                occurs_on = project_to_year(holiday_date, year)
            else:
                occurs_on = holiday_date

            holidays.append({**holiday, "occurs_on": occurs_on})

        return sorted(holidays, key=lambda holiday: (holiday["occurs_on"], holiday["holiday_id"]))

    def get(self, request):
        request_parameters = request.query_params
        holiday_id = request_parameters.get("holiday_id")

        # Get a specific holiday by ID
        if holiday_id:
            if not is_valid_id(holiday_id):
                return Response(
                    {"error": "holiday_id must be an integer."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            holiday = (
                PublicHoliday.objects
                .filter(holiday_id=holiday_id)
                .values(*self.HOLIDAY_VALUES)
                .first()
            )

            if not holiday:
                return Response(
                    {"error": "Public holiday not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            return Response({"holiday": holiday})

        try:
            queryset = PublicHoliday.objects.all()

            is_recurring = request_parameters.get("is_recurring")
            if is_recurring:
                queryset = queryset.filter(is_recurring=_parse_bool(is_recurring))

            search = request_parameters.get("search", "").strip()
            for term in search.split():
                queryset = queryset.filter(name__icontains=term)

            # Holidays for one calendar year (recurring ones moved to that year)
            year = request_parameters.get("year")
            if year:
                year = int(year)
                if not (1 <= year <= 9999):
                    raise ValueError("Invalid year.")

                holidays = self._holidays_for_year(queryset, year)
                return Response({
                    "year": year,
                    "count": len(holidays),
                    "results": holidays,
                })

            # Date range filters on the stored date
            range_filters = {
                "date_from": "date__gte",
                "date_to": "date__lte",
            }

            for param, lookup in range_filters.items():
                value = request_parameters.get(param)
                if value:
                    queryset = queryset.filter(**{lookup: value})

            holidays = (
                queryset
                .order_by("date", "holiday_id")
                .values(*self.HOLIDAY_VALUES)
            )

            paginator = self.pagination_class()
            page = paginator.paginate_queryset(holidays, request, view=self)

            return paginator.get_paginated_response(page)

        except (ValueError, TypeError, DjangoValidationError):
            return Response(
                {"error": "Invalid data entered."},
                status=status.HTTP_400_BAD_REQUEST,
            )

    def post(self, request):
        serializer = AddPublicHolidaySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        holiday = serializer.save()

        return Response(
            {
                "message": "Public holiday created successfully.",
                "holiday_id": holiday.holiday_id,
            },
            status=status.HTTP_201_CREATED,
        )

    def patch(self, request):
        holiday_id = self._get_holiday_id(request)

        if not holiday_id:
            return Response(
                {"error": "holiday_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not is_valid_id(holiday_id):
            return Response(
                {"error": "holiday_id must be an integer."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            holiday = PublicHoliday.objects.get(holiday_id=holiday_id)
        except PublicHoliday.DoesNotExist:
            return Response(
                {"error": "Public holiday not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = UpdatePublicHolidaySerializer(
            holiday,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {"message": "Public holiday updated successfully."}
        )

    def delete(self, request):
        holiday_id = self._get_holiday_id(request)

        if not holiday_id:
            return Response(
                {"error": "holiday_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not is_valid_id(holiday_id):
            return Response(
                {"error": "holiday_id must be an integer."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            holiday = PublicHoliday.objects.get(holiday_id=holiday_id)
        except PublicHoliday.DoesNotExist:
            return Response(
                {"error": "Public holiday not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        holiday.delete()

        return Response(
            {"message": "Public holiday deleted successfully."}
        )


# ==========================
# Leave
# ==========================

def _parse_date(value, field):
    try:
        return datetime.date.fromisoformat(str(value))
    except (TypeError, ValueError):
        raise DRFValidationError({field: "Enter a valid date (YYYY-MM-DD)."})


def _employee_from_params(request, param="employee_id"):
    """The employee named by ?employee_id=, or the logged-in user."""
    employee_id = request.query_params.get(param)
    if not employee_id:
        return request.user
    if not is_valid_id(employee_id):
        raise DRFValidationError({param: "Must be an integer."})
    try:
        return Employee.objects.get(employee_id=employee_id)
    except Employee.DoesNotExist:
        raise NotFound("Employee not found.")


class LeaveTypeList(APIView):
    """Leave types for the leave-type dropdown (active only unless include_inactive=true)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = LeaveType.objects.all()

        if request.query_params.get("include_inactive") not in ("1", "true"):
            queryset = queryset.filter(is_active=True)

        leave_types = queryset.order_by("name").values(
            "leave_type_id",
            "name",
            "code",
            "unit",
            "requires_allocation",
            "requires_approval",
            "is_active",
        )

        return Response({"leave_types": list(leave_types)})


class LeaveBalanceView(APIView):
    """
    Remaining leave per type for an employee (default: logged-in user) on a date
    (default: today): allocated - used (approved) - pending (submitted).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        employee = _employee_from_params(request)

        on_date = request.query_params.get("date")
        on_date = _parse_date(on_date, "date") if on_date else timezone.localdate()

        leave_types = LeaveType.objects.filter(is_active=True).order_by("name")

        leave_type_id = request.query_params.get("leave_type_id")
        if leave_type_id:
            if not is_valid_id(leave_type_id):
                raise DRFValidationError({"leave_type_id": "Must be an integer."})
            leave_types = leave_types.filter(leave_type_id=leave_type_id)
        else:
            # Balance panel: only limited types the employee actually has an allocation for
            leave_types = leave_types.filter(requires_allocation=True)

        balances = []
        for leave_type in leave_types:
            balance = leave_logic.leave_balance(employee.pk, leave_type, on_date)
            if leave_type_id or balance["allocated"]:
                balances.append(balance)

        return Response({
            "employee_id": employee.pk,
            "date": on_date,
            "balances": balances,
        })


class LeaveRequestPreview(APIView):
    """
    Counted days for a prospective request (weekends and public holidays excluded),
    checked against the balance. Writes nothing.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        params = request.query_params
        employee = _employee_from_params(request)

        leave_type_id = params.get("leave_type_id")
        if not leave_type_id or not is_valid_id(leave_type_id):
            raise DRFValidationError({"leave_type_id": "A valid leave_type_id is required."})
        try:
            leave_type = LeaveType.objects.get(leave_type_id=leave_type_id)
        except LeaveType.DoesNotExist:
            raise NotFound("Leave type not found.")

        date_from = _parse_date(params.get("date_from"), "date_from")
        date_to = _parse_date(params.get("date_to"), "date_to")
        if date_to < date_from:
            raise DRFValidationError({"date_to": "End date must be on or after the start date."})

        # When editing an existing request, don't count it against itself
        exclude_leave_id = params.get("leave_id")
        if exclude_leave_id and not is_valid_id(exclude_leave_id):
            raise DRFValidationError({"leave_id": "Must be an integer."})

        counted = leave_logic.count_leave_days(employee, date_from, date_to)

        if leave_type.unit == LeaveType.LeaveUnit.HOURS:
            amount = params.get("requested_amount")
            amount = Decimal(amount) if amount else None
        else:
            amount = Decimal(counted["counted_days"])

        balance = leave_logic.leave_balance(
            employee.pk, leave_type, date_from, exclude_leave_id
        )
        remaining = balance["remaining"]

        if remaining is None:
            enough_balance = True  # no allocation needed
        elif amount is None:
            enough_balance = None
        else:
            enough_balance = amount <= remaining

        return Response({
            "employee_id": employee.pk,
            "leave_type_id": leave_type.leave_type_id,
            "unit": leave_type.unit,
            "date_from": date_from,
            "date_to": date_to,
            **counted,
            "requested_amount": amount,
            "balance_remaining": remaining,
            "enough_balance": enough_balance,
            "overlaps": leave_logic.has_overlap(employee.pk, date_from, date_to, exclude_leave_id),
        })


class LeaveRequestManagement(APIView):
    """
    Leave requests. Status flow: draft -> submitted -> approved / refused; draft,
    submitted and approved can be cancelled. Only the assigned approver or a
    superuser can approve/refuse (see apps/hr/leave.py).
    """
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination

    LEAVE_VALUES = (
        "leave_id",
        "employee_id",
        "employee__first_name",
        "employee__last_name",
        "employee__employee_code",
        "leave_type_id",
        "leave_type__name",
        "leave_type__code",
        "leave_type__unit",
        "date_from",
        "date_to",
        "requested_amount",
        "status",
        "approver_id",
        "approver__first_name",
        "approver__last_name",
        "employee_comment",
        "reviewer_comment",
        "created_at",
        "updated_at",
    )

    EDITABLE_FIELDS = {
        "leave_type_id",
        "date_from",
        "date_to",
        "requested_amount",
        "employee_comment",
        "approver_id",
    }

    def _get_leave_id(self, request):
        return (
            request.data.get("leave_id")
            or request.query_params.get("leave_id")
        )

    def _get_leave(self, request):
        leave_id = self._get_leave_id(request)

        if not leave_id:
            raise DRFValidationError({"leave_id": "leave_id is required."})
        if not is_valid_id(leave_id):
            raise DRFValidationError({"leave_id": "leave_id must be an integer."})

        try:
            return (
                LeaveRequest.objects
                .select_related("employee", "leave_type", "approver")
                .get(leave_id=leave_id)
            )
        except LeaveRequest.DoesNotExist:
            raise NotFound("Leave request not found.")

    def get(self, request):
        params = request.query_params
        leave_id = params.get("leave_id")

        # Get a specific leave request by ID
        if leave_id:
            if not is_valid_id(leave_id):
                return Response(
                    {"error": "leave_id must be an integer."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            leave = (
                LeaveRequest.objects
                .filter(leave_id=leave_id)
                .values(*self.LEAVE_VALUES)
                .first()
            )

            if not leave:
                return Response(
                    {"error": "Leave request not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            return Response({"leave_request": leave})

        allowed_filters = {
            "employee_id",
            "leave_type_id",
            "status",
            "approver_id",
        }

        filters = {
            field: value
            for field, value in params.items()
            if field in allowed_filters and value
        }

        # "My requests"
        if params.get("mine") in ("1", "true"):
            filters["employee_id"] = request.user.pk

        # Requests waiting for my review
        if params.get("to_review") in ("1", "true"):
            filters["approver_id"] = request.user.pk
            filters["status"] = LeaveRequest.LeaveStatus.SUBMITTED

        # Requests overlapping a date range
        if params.get("date_from"):
            filters["date_to__gte"] = params["date_from"]
        if params.get("date_to"):
            filters["date_from__lte"] = params["date_to"]

        try:
            queryset = LeaveRequest.objects.filter(**filters)

            search = params.get("search", "").strip()
            for term in search.split():
                queryset = queryset.filter(
                    Q(employee__first_name__icontains=term)
                    | Q(employee__last_name__icontains=term)
                    | Q(employee__employee_code__icontains=term)
                )

            leaves = (
                queryset
                .order_by("-date_from", "-leave_id")
                .values(*self.LEAVE_VALUES)
            )

            paginator = self.pagination_class()
            page = paginator.paginate_queryset(leaves, request, view=self)

            return paginator.get_paginated_response(page)

        except (ValueError, TypeError, DjangoValidationError):
            return Response(
                {"error": "Invalid data entered."},
                status=status.HTTP_400_BAD_REQUEST,
            )

    def post(self, request):
        serializer = AddLeaveRequestSerializer(
            data=request.data,
            context={"request_user": request.user},
        )
        serializer.is_valid(raise_exception=True)

        try:
            with transaction.atomic():
                leave = serializer.save()
        except IntegrityError:
            return Response(
                {"error": "The leave request violates a database constraint."},
                status=status.HTTP_409_CONFLICT,
            )

        return Response(
            {
                "message": "Leave request created successfully.",
                "leave_id": leave.leave_id,
                "requested_amount": leave.requested_amount,
                "status": leave.status,
            },
            status=status.HTTP_201_CREATED,
        )

    def patch(self, request):
        leave = self._get_leave(request)
        user = request.user
        is_admin = bool(getattr(user, "is_superuser", False))

        wants_edit = any(field in request.data for field in self.EDITABLE_FIELDS)
        new_status = request.data.get("status")
        reviewer_comment = request.data.get("reviewer_comment")

        if not wants_edit and not new_status and reviewer_comment is None:
            return Response(
                {"error": "Nothing to update."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            with transaction.atomic():
                # 1. Edit the request's details (requester or admin only)
                if wants_edit:
                    if user.pk != leave.employee_id and not is_admin:
                        raise PermissionDenied("Only the requester can edit this leave request.")

                    serializer = UpdateLeaveRequestSerializer(
                        leave,
                        data=request.data,
                        partial=True,
                    )
                    serializer.is_valid(raise_exception=True)
                    leave = serializer.save()

                # 2. Status change (and/or reviewer comment)
                if new_status:
                    if new_status not in LeaveRequest.LeaveStatus.values:
                        raise DRFValidationError({"status": "Invalid status."})
                    leave_logic.change_status(leave, new_status, user, reviewer_comment)
                    leave.save()

                elif reviewer_comment is not None:
                    is_approver = leave.approver_id is not None and user.pk == leave.approver_id
                    if user.pk == leave.employee_id or not (is_approver or is_admin):
                        raise PermissionDenied("Only the approver or an administrator can write the reviewer comment.")
                    leave.reviewer_comment = reviewer_comment
                    leave.save(update_fields=["reviewer_comment", "updated_at"])

        except IntegrityError:
            return Response(
                {"error": "The leave request violates a database constraint."},
                status=status.HTTP_409_CONFLICT,
            )

        return Response({
            "message": "Leave request updated successfully.",
            "leave_id": leave.leave_id,
            "requested_amount": leave.requested_amount,
            "status": leave.status,
        })

    def delete(self, request):
        leave = self._get_leave(request)
        user = request.user

        if user.pk != leave.employee_id and not getattr(user, "is_superuser", False):
            raise PermissionDenied("Only the requester can delete this leave request.")

        if leave.status != LeaveRequest.LeaveStatus.DRAFT:
            return Response(
                {"error": "Only draft leave requests can be deleted. Cancel it instead."},
                status=status.HTTP_409_CONFLICT,
            )

        leave.delete()

        return Response(
            {"message": "Leave request deleted successfully."}
        )
