from django.urls import path
from .views import (
    SkillCategoryManagement,
    SkillManagement,
    EmployeeSkillManagement,
    AttendanceManagement,
    EmploymentContractManagement,
)

urlpatterns = [
    path(
        "skill-categories/",
        SkillCategoryManagement.as_view(),
        name="skill-categories",
    ),
    path(
        "skills/",
        SkillManagement.as_view(),
        name="skills",
    ),
    path(
        "employee-skills/",
        EmployeeSkillManagement.as_view(),
        name="employee-skills",
    ),
    path(
        "attendance/",
        AttendanceManagement.as_view(),
        name="attendance"
    ),
    path(
        "contracts/",
        EmploymentContractManagement.as_view(),
        name="contracts",
    ),
]
