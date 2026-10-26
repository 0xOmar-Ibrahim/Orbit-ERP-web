from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


# ==============================================================================
# ABO ELNOUR: HR Module — Full schema built from scratch.
#
# Table creation order (respects FK dependencies):
#   1. Department          — needs accounts.Employee (manager) via string ref
#   2. JobPosition         — needs Department
#   3. WorkSchedule        — independent
#   4. WorkScheduleLine    — needs WorkSchedule
#   5. EmployeeDocument    — needs accounts.Employee
#   6. EmployeeHistory     — needs accounts.Employee
#   7. EmploymentContract  — needs Employee, JobPosition, WorkSchedule
#   8. Attendance          — needs accounts.Employee
#   9. LeaveType           — independent
#  10. PublicHoliday       — independent
#  11. LeaveAllocation     — needs Employee, LeaveType
#  12. LeaveRequest        — needs Employee, LeaveType
#  13. SkillCategory       — independent
#  14. Skill               — needs SkillCategory
#  15. EmployeeSkill       — needs Employee, Skill
#  16. Appraisal           — needs accounts.Employee (x2)
#  17. RecruitmentJob      — needs Department, JobPosition, Employee
#  18. Applicant           — needs RecruitmentJob, Employee
#  19. Payroll             — needs Employee, EmploymentContract
# ==============================================================================


# ABO ELNOUR: Department — organizational unit with optional parent for a tree hierarchy.
# manager FK uses a string reference to accounts.Employee to avoid the circular import
# that would occur if accounts imported from hr and hr imported from accounts.
class Department(models.Model):
    """Department Table — org chart node, supports unlimited nesting (db_table: department)"""
    department_id = models.AutoField(primary_key=True)
    # ABO ELNOUR: department_name is globally unique — if multi-branch is needed later,
    # change to UNIQUE(department_name, branch_id).
    department_name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    # ABO ELNOUR: parent_department enables nested org chart (e.g., Engineering > Backend Team).
    # SET_NULL so deleting a parent department orphans children rather than deleting them.
    parent_department = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sub_departments",
        db_column="parent_department_id",
    )

    # ABO ELNOUR: manager links to accounts.Employee via string ref to break circular FK.
    # SET_NULL so removing an employee does not destroy department records.
    manager = models.ForeignKey(
        "accounts.Employee",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="managed_departments",
        db_column="manager_id",
    )

    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "department"
        constraints = [
            # ABO ELNOUR: prevents a department from being its own direct parent.
            # Note: deeper circular chains (A→B→A) require application-level validation.
            models.CheckConstraint(
                check=(
                    models.Q(parent_department__isnull=True) |
                    ~models.Q(parent_department=models.F("department_id"))
                ),
                name="chk_dept_no_self_parent",
            ),
        ]

    def __str__(self):
        return self.department_name


# ABO ELNOUR: JobPosition — a named role that employees can hold (e.g., "Sales Manager").
# title is globally unique; if multi-branch support is added later, change to
# UNIQUE(title, department_id) to allow the same title in different departments.
class JobPosition(models.Model):
    """JobPosition Table — available job titles in the org (db_table: job_position)"""
    position_id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=120, unique=True)
    department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="positions",
        db_column="department_id",
    )
    description = models.TextField(blank=True)
    # ABO ELNOUR: expected_employee_count is the headcount target for this position.
    # Used in recruitment to know how many openings to advertise.
    expected_employee_count = models.PositiveIntegerField(default=1)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "job_position"

    def __str__(self):
        return self.title


# ABO ELNOUR: WorkSchedule — a named weekly work timetable (e.g., "Standard 9-5 Cairo").
# timezone_name is stored here so that check_in/check_out times in Attendance
# can be correctly offset — important when TIME_ZONE in settings is UTC.
class WorkSchedule(models.Model):
    """WorkSchedule Table — defines a named weekly work pattern (db_table: work_schedule)"""
    schedule_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100, unique=True)
    # ABO ELNOUR: timezone_name must be a valid IANA timezone string (e.g., "Africa/Cairo").
    # Used to convert UTC check_in/check_out datetimes to local time for worked_minutes calculation.
    timezone_name = models.CharField(max_length=64, default="Africa/Cairo")
    hours_per_week = models.DecimalField(max_digits=5, decimal_places=2)
    active = models.BooleanField(default=True)

    class Meta:
        db_table = "work_schedule"

    def __str__(self):
        return self.name


# ABO ELNOUR: WorkScheduleLine — one row per working day inside a WorkSchedule.
# Each row defines the start/end times and break duration for that weekday.
class WorkScheduleLine(models.Model):
    """WorkScheduleLine Table — daily time entries for a work schedule (db_table: work_schedule_line)"""

    class Weekday(models.IntegerChoices):
        MONDAY = 2, "Monday"
        TUESDAY = 3, "Tuesday"
        WEDNESDAY = 4, "Wednesday"
        THURSDAY = 5, "Thursday"
        FRIDAY = 6, "Friday"
        SATURDAY = 0, "Saturday"
        SUNDAY = 1, "Sunday"

    line_id = models.AutoField(primary_key=True)
    schedule = models.ForeignKey(
        WorkSchedule,
        on_delete=models.CASCADE,
        related_name="lines",
        db_column="schedule_id",
    )
    weekday = models.SmallIntegerField(choices=Weekday.choices)
    start_time = models.TimeField()
    end_time = models.TimeField()
    # ABO ELNOUR: break_minutes is subtracted when calculating net worked hours.
    break_minutes = models.SmallIntegerField(default=0)

    class Meta:
        db_table = "work_schedule_line"
        constraints = [
            # ABO ELNOUR: only one time entry per weekday per schedule is allowed.
            models.UniqueConstraint(
                fields=["schedule", "weekday"],
                name="uq_schedule_weekday",
            ),
            # ABO ELNOUR: end_time must be strictly after start_time.
            models.CheckConstraint(
                check=models.Q(end_time__gt=models.F("start_time")),
                name="chk_schedule_time_order",
            ),
        ]

    def __str__(self):
        return f"{self.schedule} | {self.get_weekday_display()} {self.start_time}-{self.end_time}"


# ABO ELNOUR: EmployeeDocument — file attachments linked to an employee record.
# Stores metadata only; the actual file is saved to the filesystem via file_path.
class EmployeeDocument(models.Model):
    """EmployeeDocument Table — tracks uploaded files for each employee (db_table: employee_document)"""

    class DocumentType(models.TextChoices):
        NATIONAL_ID = "national_id", "National ID"
        PASSPORT = "passport", "Passport"
        CONTRACT = "contract", "Contract"
        CERTIFICATE = "certificate", "Certificate"
        OTHER = "other", "Other"

    document_id = models.AutoField(primary_key=True)
    employee = models.ForeignKey(
        "accounts.Employee",
        on_delete=models.PROTECT,
        related_name="documents",
        db_column="employee_id",
    )
    document_type = models.CharField(max_length=20, choices=DocumentType.choices)
    document_name = models.CharField(max_length=200)
    # ABO ELNOUR: file_path stores the server-side relative path to the uploaded document.
    file_path = models.CharField(max_length=500)
    # ABO ELNOUR: expiry_date tracks document validity (e.g., passport expiry, work permit).
    # Null for documents without an expiry (e.g., birth certificate).
    expiry_date = models.DateField(null=True, blank=True)
    uploaded_by = models.ForeignKey(
        "accounts.Employee",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="uploaded_documents",
        db_column="uploaded_by_id",
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "employee_document"

    def __str__(self):
        return f"{self.document_type} — {self.employee}"


# ABO ELNOUR: EmployeeHistory — immutable audit log of career changes.
# Each row records one event (promotion, transfer, salary change, etc.)
# with the before/after values stored as text for schema flexibility.
class EmployeeHistory(models.Model):
    """EmployeeHistory Table — append-only career event log (db_table: employee_history)"""

    class ChangeType(models.TextChoices):
        PROMOTION = "promotion", "Promotion"
        TRANSFER = "transfer", "Transfer"
        SALARY_CHANGE = "salary_change", "Salary Change"
        STATUS_CHANGE = "status_change", "Status Change"
        POSITION_CHANGE = "position_change", "Position Change"
        OTHER = "other", "Other"

    history_id = models.AutoField(primary_key=True)
    employee = models.ForeignKey(
        "accounts.Employee",
        on_delete=models.PROTECT,
        related_name="history",
        db_column="employee_id",
    )
    change_type = models.CharField(max_length=20, choices=ChangeType.choices)
    # ABO ELNOUR: old_value and new_value capture the before/after state as free text.
    # Example: old_value="Junior Developer", new_value="Senior Developer"
    old_value = models.TextField(blank=True)
    new_value = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    change_date = models.DateField()
    recorded_by = models.ForeignKey(
        "accounts.Employee",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="recorded_histories",
        db_column="recorded_by_id",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "employee_history"
        # ABO ELNOUR: composite index for fast timeline queries per employee
        indexes = [
            models.Index(fields=["employee", "change_date"], name="idx_emp_history_date"),
        ]

    def __str__(self):
        return f"{self.employee} — {self.change_type} on {self.change_date}"


# ABO ELNOUR: EmploymentContract — the legal work agreement for an employee.
# An employee can have multiple contracts over time (e.g., renewal, type change),
# but only ONE may have status='running' at any given time (enforced by partial unique index).
class EmploymentContract(models.Model):
    """EmploymentContract Table — tracks work agreements per employee (db_table: employment_contract)"""

    class ContractType(models.TextChoices):
        PERMANENT = "permanent", "Permanent"
        FIXED_TERM = "fixed_term", "Fixed Term"
        TEMPORARY = "temporary", "Temporary"
        INTERN = "intern", "Intern"
        CONTRACTOR = "contractor", "Contractor"

    class ContractStatus(models.TextChoices):
        DRAFT = "draft", "Draft"
        RUNNING = "running", "Running"
        EXPIRED = "expired", "Expired"
        TERMINATED = "terminated", "Terminated"

    contract_id = models.AutoField(primary_key=True)
    # ABO ELNOUR: contract_number is a human-readable unique document reference (e.g., "EMP-2024-0042").
    contract_number = models.CharField(max_length=40, unique=True)
    employee = models.ForeignKey(
        "accounts.Employee",
        on_delete=models.PROTECT,
        related_name="contracts",
        db_column="employee_id",
    )
    contract_type = models.CharField(max_length=15, choices=ContractType.choices)
    start_date = models.DateField()
    # ABO ELNOUR: end_date is NULL for permanent/open-ended contracts.
    end_date = models.DateField(null=True, blank=True)
    position = models.ForeignKey(
        JobPosition,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="contracts",
        db_column="position_id",
    )
    schedule = models.ForeignKey(
        WorkSchedule,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="contracts",
        db_column="schedule_id",
    )
    wage = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default="EGP")
    status = models.CharField(
        max_length=15,
        choices=ContractStatus.choices,
        default=ContractStatus.DRAFT,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "employment_contract"
        constraints = [
            # ABO ELNOUR: end_date must be strictly after start_date when provided.
            models.CheckConstraint(
                check=(
                    models.Q(end_date__isnull=True) |
                    models.Q(end_date__gt=models.F("start_date"))
                ),
                name="chk_contract_date_order",
            ),
        ]
        indexes = [
            # ABO ELNOUR: partial unique index — only one RUNNING contract allowed per employee.
            # Prevents duplicate active contracts for the same person.
            models.UniqueConstraint(
                fields=["employee"],
                condition=models.Q(status="running"),
                name="uq_one_running_contract_per_employee",
            ),
            models.Index(fields=["employee"], name="idx_contract_employee"),
        ]

    def __str__(self):
        return f"{self.contract_number} — {self.employee}"


# ABO ELNOUR: Attendance — one row per employee per calendar day.
# check_in and check_out use DateTimeField (not TimeField) to correctly
# handle night-shift workers whose shift spans midnight.
class Attendance(models.Model):
    """Attendance Table — daily check-in/check-out records (db_table: attendance)"""

    class AttendanceStatus(models.TextChoices):
        PRESENT = "present", "Present"
        ABSENT = "absent", "Absent"
        LATE = "late", "Late"
        HALF_DAY = "half_day", "Half Day"
        ON_LEAVE = "on_leave", "On Leave"
        HOLIDAY = "holiday", "Holiday"

    attendance_id = models.AutoField(primary_key=True)
    employee = models.ForeignKey(
        "accounts.Employee",
        on_delete=models.PROTECT,
        related_name="attendances",
        db_column="employee_id",
    )
    attendance_date = models.DateField()
    check_in = models.DateTimeField(null=True, blank=True)
    check_out = models.DateTimeField(null=True, blank=True)
    # ABO ELNOUR: worked_minutes and overtime_minutes are computed and stored for payroll use.
    # They should be recalculated whenever check_in or check_out changes.
    worked_minutes = models.PositiveIntegerField(default=0)
    overtime_minutes = models.PositiveIntegerField(default=0)
    status = models.CharField(
        max_length=10,
        choices=AttendanceStatus.choices,
        default=AttendanceStatus.PRESENT,
    )
    notes = models.TextField(blank=True)

    class Meta:
        db_table = "attendance"
        constraints = [
            # ABO ELNOUR: only one attendance record allowed per employee per day.
            models.UniqueConstraint(
                fields=["employee", "attendance_date"],
                name="uq_attendance_employee_date",
            ),
            # ABO ELNOUR: check_out must be after check_in when both are set.
            models.CheckConstraint(
                check=(
                    models.Q(check_out__isnull=True) |
                    models.Q(check_out__gt=models.F("check_in"))
                ),
                name="chk_attendance_time_order",
            ),
        ]
        # ABO ELNOUR: composite index for fast attendance range queries per employee
        indexes = [
            models.Index(fields=["employee", "attendance_date"], name="idx_attendance_emp_date"),
            models.Index(fields=["attendance_date"], name="idx_attendance_date"),
        ]

    def __str__(self):
        return f"{self.employee} — {self.attendance_date}"


# ABO ELNOUR: LeaveType — defines a category of leave with its rules.
# Examples: Annual Leave, Sick Leave, Unpaid Leave, Maternity Leave.
class LeaveType(models.Model):
    """LeaveType Table — configurable leave categories with business rules (db_table: leave_type)"""

    class LeaveUnit(models.TextChoices):
        DAYS = "days", "Days"
        HOURS = "hours", "Hours"

    leave_type_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100, unique=True)
    # ABO ELNOUR: code is a short identifier used in payslips and reports (e.g., "AL", "SL").
    code = models.CharField(max_length=10, unique=True)
    unit = models.CharField(max_length=5, choices=LeaveUnit.choices, default=LeaveUnit.DAYS)
    # ABO ELNOUR: requires_allocation means the employee must have a balance granted before requesting.
    requires_allocation = models.BooleanField(default=True)
    requires_approval = models.BooleanField(default=True)
    allow_carryover = models.BooleanField(default=False)
    # ABO ELNOUR: max_carryover caps carry-over days to next year (0 = no limit when allow_carryover=True).
    max_carryover = models.PositiveSmallIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "leave_type"

    def __str__(self):
        return f"{self.code} — {self.name}"


# ABO ELNOUR: PublicHoliday — official holidays excluded from leave day count.
# Without this table, leave calculations will incorrectly charge vacation days
# for holidays that fall within the requested leave period.
class PublicHoliday(models.Model):
    """PublicHoliday Table — official non-working days (db_table: public_holiday)"""
    holiday_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=150)
    # ABO ELNOUR: date is unique — no two holidays on the same calendar day.
    date = models.DateField(unique=True)
    # ABO ELNOUR: is_recurring marks holidays that repeat annually on the same date (e.g., Eid).
    # Non-recurring holidays must be added explicitly each year.
    is_recurring = models.BooleanField(default=False)

    class Meta:
        db_table = "public_holiday"
        # ABO ELNOUR: index for fast date range lookups during leave calculation
        indexes = [
            models.Index(fields=["date"], name="idx_holiday_date"),
        ]

    def __str__(self):
        return f"{self.name} — {self.date}"


# ABO ELNOUR: LeaveAllocation — grants a specific leave balance to an employee.
# An employee can only request leave for a type if they have an approved allocation
# (when LeaveType.requires_allocation = True).
class LeaveAllocation(models.Model):
    """LeaveAllocation Table — leave balance grants per employee per period (db_table: leave_allocation)"""

    class AllocationStatus(models.TextChoices):
        DRAFT = "draft", "Draft"
        APPROVED = "approved", "Approved"
        REFUSED = "refused", "Refused"

    allocation_id = models.AutoField(primary_key=True)
    employee = models.ForeignKey(
        "accounts.Employee",
        on_delete=models.PROTECT,
        related_name="leave_allocations",
        db_column="employee_id",
    )
    leave_type = models.ForeignKey(
        LeaveType,
        on_delete=models.PROTECT,
        related_name="allocations",
        db_column="leave_type_id",
    )
    # ABO ELNOUR: amount is in the unit defined by LeaveType.unit (days or hours).
    amount = models.DecimalField(max_digits=6, decimal_places=2)
    valid_from = models.DateField()
    valid_to = models.DateField()
    status = models.CharField(
        max_length=10,
        choices=AllocationStatus.choices,
        default=AllocationStatus.DRAFT,
    )
    approved_by = models.ForeignKey(
        "accounts.Employee",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_allocations",
        db_column="approved_by_id",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "leave_allocation"
        constraints = [
            # ABO ELNOUR: valid_to must be strictly after valid_from.
            models.CheckConstraint(
                check=models.Q(valid_to__gt=models.F("valid_from")),
                name="chk_allocation_date_order",
            ),
        ]
        # ABO ELNOUR: index for fast lookup of active allocations per employee
        indexes = [
            models.Index(
                fields=["employee", "leave_type", "valid_from"],
                name="idx_allocation_emp_type",
            ),
        ]

    def __str__(self):
        return f"{self.employee} — {self.leave_type} ({self.amount})"


# ABO ELNOUR: LeaveRequest — an employee's request to take time off.
# The system must check leave balance (from LeaveAllocation) and absence of overlap
# with existing approved requests before approving (application-level logic).
class LeaveRequest(models.Model):
    """LeaveRequest Table — employee time-off requests and approval state (db_table: leave_request)"""

    class LeaveStatus(models.TextChoices):
        DRAFT = "draft", "Draft"
        SUBMITTED = "submitted", "Submitted"
        APPROVED = "approved", "Approved"
        REFUSED = "refused", "Refused"
        CANCELLED = "cancelled", "Cancelled"

    leave_id = models.AutoField(primary_key=True)
    employee = models.ForeignKey(
        "accounts.Employee",
        on_delete=models.PROTECT,
        related_name="leave_requests",
        db_column="employee_id",
    )
    leave_type = models.ForeignKey(
        LeaveType,
        on_delete=models.PROTECT,
        related_name="requests",
        db_column="leave_type_id",
    )
    date_from = models.DateField()
    date_to = models.DateField()
    # ABO ELNOUR: requested_amount is the computed number of working days/hours.
    # Must exclude weekends and public holidays from the date_from–date_to range.
    requested_amount = models.DecimalField(max_digits=6, decimal_places=2)
    status = models.CharField(
        max_length=10,
        choices=LeaveStatus.choices,
        default=LeaveStatus.DRAFT,
    )
    approver = models.ForeignKey(
        "accounts.Employee",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="leave_approvals",
        db_column="approver_id",
    )
    reviewer_comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "leave_request"
        constraints = [
            # ABO ELNOUR: date_to must be on or after date_from (single-day requests allowed).
            models.CheckConstraint(
                check=models.Q(date_to__gte=models.F("date_from")),
                name="chk_leave_date_order",
            ),
            # ABO ELNOUR: the approver cannot be the same person as the requester.
            # This constraint is enforced only when an approver is set.
            models.CheckConstraint(
                check=(
                    models.Q(approver__isnull=True) |
                    ~models.Q(approver=models.F("employee"))
                ),
                name="chk_leave_approver_not_self",
            ),
        ]
        # ABO ELNOUR: index for per-employee leave history and status dashboard queries
        indexes = [
            models.Index(fields=["employee", "date_from"], name="idx_leave_emp_date"),
            models.Index(fields=["status"], name="idx_leave_status"),
        ]

    def __str__(self):
        return f"{self.employee} — {self.leave_type} ({self.date_from} to {self.date_to})"


# ABO ELNOUR: SkillCategory — groups related skills under a named category.
# Examples: Technical, Management, Languages, Soft Skills.
class SkillCategory(models.Model):
    """SkillCategory Table — top-level grouping for skills (db_table: skill_category)"""
    skill_category_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        db_table = "skill_category"

    def __str__(self):
        return self.name


# ABO ELNOUR: Skill — an individual skill belonging to one SkillCategory.
# name is unique within its category (not globally) to allow "Python" under
# Technical and also allow future categories without collision.
class Skill(models.Model):
    """Skill Table — individual skills within a category (db_table: skill)"""
    skill_id = models.AutoField(primary_key=True)
    skill_category = models.ForeignKey(
        SkillCategory,
        on_delete=models.PROTECT,
        related_name="skills",
        db_column="skill_category_id",
    )
    name = models.CharField(max_length=100)

    class Meta:
        db_table = "skill"
        # ABO ELNOUR: skill name is unique within its category, not globally.
        constraints = [
            models.UniqueConstraint(
                fields=["skill_category", "name"],
                name="uq_skill_category_name",
            ),
        ]

    def __str__(self):
        return f"{self.skill_category} — {self.name}"


# ABO ELNOUR: EmployeeSkill — junction table (M:N) linking employees to their skills.
# Each (employee, skill) pair is unique — an employee cannot have the same skill twice.
class EmployeeSkill(models.Model):
    """EmployeeSkill Table — employee skills with proficiency level (db_table: employee_skill)"""

    class SkillLevel(models.IntegerChoices):
        BEGINNER = 1, "Beginner"
        INTERMEDIATE = 2, "Intermediate"
        ADVANCED = 3, "Advanced"
        EXPERT = 4, "Expert"

    employee_skill_id = models.AutoField(primary_key=True)
    employee = models.ForeignKey(
        "accounts.Employee",
        on_delete=models.PROTECT,
        related_name="skills",
        db_column="employee_id",
    )
    skill = models.ForeignKey(
        Skill,
        on_delete=models.PROTECT,
        related_name="employee_skills",
        db_column="skill_id",
    )
    level = models.SmallIntegerField(choices=SkillLevel.choices)
    # ABO ELNOUR: years_experience provides additional context beyond the level integer.
    years_experience = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = "employee_skill"
        # ABO ELNOUR: prevents duplicate skill entries for the same employee.
        constraints = [
            models.UniqueConstraint(
                fields=["employee", "skill"],
                name="uq_employee_skill",
            ),
        ]

    def __str__(self):
        return f"{self.employee} — {self.skill} (Level {self.level})"


# ABO ELNOUR: Appraisal — a periodic performance review record.
# Constraints enforce:
#   - an employee cannot review themselves
#   - only one appraisal per employee per review period
class Appraisal(models.Model):
    """Appraisal Table — periodic performance evaluations (db_table: appraisal)"""

    class AppraisalStatus(models.TextChoices):
        DRAFT = "draft", "Draft"
        IN_PROGRESS = "in_progress", "In Progress"
        DONE = "done", "Done"
        CANCELLED = "cancelled", "Cancelled"

    appraisal_id = models.AutoField(primary_key=True)
    employee = models.ForeignKey(
        "accounts.Employee",
        on_delete=models.PROTECT,
        related_name="appraisals",
        db_column="employee_id",
    )
    # ABO ELNOUR: reviewer is the manager or HR rep conducting the evaluation.
    # Must differ from employee (enforced by chk_appraisal_no_self_review).
    reviewer = models.ForeignKey(
        "accounts.Employee",
        on_delete=models.PROTECT,
        related_name="conducted_appraisals",
        db_column="reviewer_id",
    )
    period_start = models.DateField()
    period_end = models.DateField()
    employee_feedback = models.TextField(blank=True)
    manager_feedback = models.TextField(blank=True)
    # ABO ELNOUR: rating is a 1–5 integer score representing overall performance.
    # Nullable until the appraisal is completed.
    rating = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
    )
    status = models.CharField(
        max_length=15,
        choices=AppraisalStatus.choices,
        default=AppraisalStatus.DRAFT,
    )
    goals = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "appraisal"
        constraints = [
            # ABO ELNOUR: an employee cannot be their own reviewer.
            models.CheckConstraint(
                check=~models.Q(reviewer=models.F("employee")),
                name="chk_appraisal_no_self_review",
            ),
            # ABO ELNOUR: period_end must be after period_start.
            models.CheckConstraint(
                check=models.Q(period_end__gt=models.F("period_start")),
                name="chk_appraisal_period_order",
            ),
            # ABO ELNOUR: only one appraisal allowed per employee per review period.
            models.UniqueConstraint(
                fields=["employee", "period_start", "period_end"],
                name="uq_appraisal_employee_period",
            ),
        ]

    def __str__(self):
        return f"Appraisal: {self.employee} ({self.period_start} to {self.period_end})"


# ABO ELNOUR: RecruitmentJob — an open job posting that candidates can apply to.
class RecruitmentJob(models.Model):
    """RecruitmentJob Table — open job postings for hiring (db_table: recruitment_job)"""

    class JobStatus(models.TextChoices):
        DRAFT = "draft", "Draft"
        OPEN = "open", "Open"
        CLOSED = "closed", "Closed"
        CANCELLED = "cancelled", "Cancelled"

    job_id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=200)
    department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="recruitment_jobs",
        db_column="department_id",
    )
    position = models.ForeignKey(
        JobPosition,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="recruitment_jobs",
        db_column="position_id",
    )
    # ABO ELNOUR: openings is the number of seats available for this posting.
    openings = models.PositiveSmallIntegerField(default=1)
    recruiter = models.ForeignKey(
        "accounts.Employee",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="recruitment_jobs",
        db_column="recruiter_id",
    )
    status = models.CharField(
        max_length=10,
        choices=JobStatus.choices,
        default=JobStatus.DRAFT,
    )
    opened_at = models.DateField(null=True, blank=True)
    closed_at = models.DateField(null=True, blank=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "recruitment_job"
        # ABO ELNOUR: index for fast filtering of open/closed job postings
        indexes = [
            models.Index(fields=["status"], name="idx_recruitment_job_status"),
        ]

    def __str__(self):
        return f"{self.title} ({self.status})"


# ABO ELNOUR: Applicant — a person who applied to a RecruitmentJob posting.
# When stage moves to HIRED, hired_employee must be populated (enforced by constraint).
class Applicant(models.Model):
    """Applicant Table — job candidates and their pipeline stage (db_table: applicant)"""

    class ApplicantStage(models.TextChoices):
        NEW = "new", "New"
        SCREENING = "screening", "Screening"
        INTERVIEW = "interview", "Interview"
        OFFER = "offer", "Offer"
        HIRED = "hired", "Hired"
        REFUSED = "refused", "Refused"

    applicant_id = models.AutoField(primary_key=True)
    job = models.ForeignKey(
        RecruitmentJob,
        on_delete=models.PROTECT,
        related_name="applicants",
        db_column="job_id",
    )
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    # ABO ELNOUR: cv stores the server-side file path to the uploaded CV document.
    cv = models.CharField(max_length=500, blank=True)
    stage = models.CharField(
        max_length=10,
        choices=ApplicantStage.choices,
        default=ApplicantStage.NEW,
    )
    interview_date = models.DateTimeField(null=True, blank=True)
    # ABO ELNOUR: hired_employee links the applicant to the created Employee record after hiring.
    # Must not be NULL when stage = HIRED (enforced by chk_applicant_hired_has_employee).
    hired_employee = models.ForeignKey(
        "accounts.Employee",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="applicant_records",
        db_column="hired_employee_id",
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "applicant"
        constraints = [
            # ABO ELNOUR: a HIRED applicant must have a linked employee record.
            # Prevents data inconsistency where stage=hired but no employee was created.
            models.CheckConstraint(
                check=(
                    ~models.Q(stage="hired") |
                    models.Q(hired_employee__isnull=False)
                ),
                name="chk_applicant_hired_has_employee",
            ),
        ]
        # ABO ELNOUR: index for filtering applicants by job and pipeline stage
        indexes = [
            models.Index(fields=["job", "stage"], name="idx_applicant_job_stage"),
        ]

    def __str__(self):
        return f"{self.first_name} {self.last_name} — {self.job}"


# ABO ELNOUR: Payroll — one salary record per employee per pay period.
# Constraints ensure:
#   - no duplicate payroll for the same (employee, period)
#   - net_pay equals base_salary + allowances - deductions
#   - period dates are in the correct order
# The contract FK links to the active EmploymentContract for audit purposes.
class Payroll(models.Model):
    """Payroll Table — monthly salary records per employee (db_table: payroll)"""

    class PayrollStatus(models.TextChoices):
        DRAFT = "draft", "Draft"
        APPROVED = "approved", "Approved"
        PAID = "paid", "Paid"
        CANCELLED = "cancelled", "Cancelled"

    payroll_id = models.AutoField(primary_key=True)
    employee = models.ForeignKey(
        "accounts.Employee",
        on_delete=models.PROTECT,
        related_name="payrolls",
        db_column="employee_id",
    )
    # ABO ELNOUR: contract links payroll to the EmploymentContract active at pay time.
    # Provides a wage baseline and audit trail; SET_NULL preserves payroll if contract is removed.
    contract = models.ForeignKey(
        EmploymentContract,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payrolls",
        db_column="contract_id",
    )
    period_start = models.DateField()
    period_end = models.DateField()
    # ABO ELNOUR: base_salary is the fixed gross wage for this period (from the contract).
    base_salary = models.DecimalField(max_digits=12, decimal_places=2)
    # ABO ELNOUR: allowances is the total of all additions (housing, transport, overtime pay, etc.).
    allowances = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    # ABO ELNOUR: deductions is the total of all subtractions (social insurance, penalties, loans).
    deductions = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    # ABO ELNOUR: net_pay is stored for quick access but must always equal
    # base_salary + allowances - deductions (enforced by chk_payroll_net_pay).
    net_pay = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default="EGP")
    status = models.CharField(
        max_length=10,
        choices=PayrollStatus.choices,
        default=PayrollStatus.DRAFT,
    )
    payment_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "payroll"
        constraints = [
            # ABO ELNOUR: only one payroll record per employee per pay period.
            # Prevents accidental duplicate salary runs.
            models.UniqueConstraint(
                fields=["employee", "period_start", "period_end"],
                name="uq_payroll_employee_period",
            ),
            # ABO ELNOUR: net_pay integrity check — stored value must match the formula.
            # Formula: net_pay = base_salary + allowances - deductions
            models.CheckConstraint(
                check=models.Q(
                    net_pay=models.F("base_salary") +
                    models.F("allowances") -
                    models.F("deductions")
                ),
                name="chk_payroll_net_pay",
            ),
            # ABO ELNOUR: period_end must be strictly after period_start.
            models.CheckConstraint(
                check=models.Q(period_end__gt=models.F("period_start")),
                name="chk_payroll_period_order",
            ),
        ]
        # ABO ELNOUR: index for fast per-employee payroll history sorted by period
        indexes = [
            models.Index(fields=["employee", "period_start"], name="idx_payroll_emp_period"),
        ]

    def __str__(self):
        return f"Payroll: {self.employee} ({self.period_start} to {self.period_end})"
