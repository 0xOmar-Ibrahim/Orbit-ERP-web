from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


# ABO ELNOUR: LeadSource replaces the free-text 'campaign' CharField on Customer.
# Provides a controlled vocabulary for customer acquisition channels
# (e.g., "Google Ads", "Referral", "Walk-in") and enables clean reporting.
class LeadSource(models.Model):
    """LeadSource Table — predefined customer acquisition channels (db_table: lead_source)"""
    source_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    # ABO ELNOUR: is_active allows disabling obsolete sources without deleting historical data
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "lead_source"

    def __str__(self):
        return self.name


class Customer(models.Model):

    customer_id = models.AutoField(primary_key=True)
    customer_code = models.CharField(max_length=30, unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    phone = models.CharField(max_length=20, blank=True)
    company_name = models.CharField(max_length=150, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)

    # ABO ELNOUR: lead_source replaces the old free-text 'campaign' field.
    # FK to LeadSource ensures consistent acquisition channel data for reporting.
    # SET_NULL preserves customer records if a source is deleted.
    lead_source = models.ForeignKey(
        LeadSource,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="customers",
        db_column="lead_source_id",
    )

    # ABO ELNOUR: assigned_employee links a responsible sales representative to the customer.
    # Required for commission calculation and rep-level data filtering.
    # SET_NULL so that removing an employee does not delete customer records.
    # assigned_employee = models.ForeignKey(
    #     "accounts.Employee",
    #     on_delete=models.SET_NULL,
    #     null=True,
    #     blank=True,
    #     related_name="assigned_customers",
    #     db_column="assigned_employee_id",
    # )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "customer"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.customer_code} - {self.first_name} {self.last_name}"


class Contact(models.Model):
    contact_id = models.AutoField(primary_key=True)
    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name="contacts",
        db_column="customer_id",
    )
    name = models.CharField(max_length=150)
    job_title = models.CharField(max_length=100, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    is_primary = models.BooleanField(default=False)

    class Meta:
        db_table = "contact"
        constraints = [
            # only one primary contact per customer
            models.UniqueConstraint(
                fields=["customer"],
                condition=models.Q(is_primary=True),
                name="unique_primary_contact_per_customer",
            )
        ]

    def __str__(self):
        return self.name


class Opportunity(models.Model):
    class Stage(models.TextChoices):
        LEAD = "lead", "Lead"
        QUALIFIED = "qualified", "Qualified"
        PROPOSAL = "proposal", "Proposal"
        NEGOTIATION = "negotiation", "Negotiation"
        CLOSED = "closed", "Closed"

    class Status(models.TextChoices):
        OPEN = "open", "Open"
        WON = "won", "Won"
        LOST = "lost", "Lost"

    opportunity_id = models.AutoField(primary_key=True)

    customer = models.ForeignKey(
        Customer,
        # ABO ELNOUR: changed from CASCADE to PROTECT.
        # Opportunity records have business value (revenue forecasts, history).
        # A customer must be explicitly handled before deletion, not silently wiped.
        on_delete=models.PROTECT,
        related_name="opportunities",
        db_column="customer_id",
    )
    employee = models.ForeignKey(
        "accounts.Employee",
        on_delete=models.PROTECT,
        related_name="opportunities",
        db_column="employee_id",
    )
    title = models.CharField(max_length=200)
    estimated_value = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # ABO ELNOUR: currency stores the deal currency code (ISO 4217).
    # Important for multi-currency pipelines (e.g., EGP, USD, EUR).
    currency = models.CharField(max_length=3, default="EGP")

    stage = models.CharField(max_length=20, choices=Stage.choices, default=Stage.LEAD)

    # ABO ELNOUR: probability default values per stage should be set by the view or signal layer.
    # Stored here for quick read access without recalculation.
    # Stage → probability mapping: lead=10, qualified=30, proposal=50, negotiation=75, closed=100
    probability = models.PositiveSmallIntegerField(
        default=10,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Win probability 0-100%. Auto-set by stage; can be overridden manually.",
    )

    expected_close_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.OPEN)

    # ABO ELNOUR: lost_reason captures why the deal was not won.
    # Used for sales loss analysis and coaching; only relevant when status = LOST.
    lost_reason = models.TextField(blank=True)

    # ABO ELNOUR: created_at records when the opportunity was first opened.
    # closed_at records when it moved to WON or LOST status.
    created_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "opportunity"
        ordering = ["-created_at"]
        constraints = [
            # ABO ELNOUR: prevents logical inconsistency between stage and status.
            # A deal cannot be in CLOSED stage while still marked as OPEN.
            models.CheckConstraint(
                check=~models.Q(stage="closed", status="open"),
                name="chk_opportunity_stage_status",
            ),
        ]
        # ABO ELNOUR: indexes to speed up pipeline dashboard and rep-level filtering
        indexes = [
            models.Index(fields=["status", "stage"], name="idx_opportunity_status_stage"),
            models.Index(fields=["employee", "status"], name="idx_opportunity_emp_status"),
            models.Index(fields=["created_at"], name="idx_opportunity_created"),
        ]

    def __str__(self):
        return self.title


class Interaction(models.Model):
    class InteractionType(models.TextChoices):
        CALL = "call", "Call"
        EMAIL = "email", "Email"
        MEETING = "meeting", "Meeting"

    interaction_id = models.AutoField(primary_key=True)
    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name="interactions",
        db_column="customer_id",
    )
    employee = models.ForeignKey(
        "accounts.Employee",
        on_delete=models.PROTECT,
        related_name="interactions",
        db_column="employee_id",
    )

    # ABO ELNOUR: contact links the interaction to the specific person spoken to,
    # not just the parent company. Nullable because interactions can be at company level.
    contact = models.ForeignKey(
        Contact,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="interactions",
        db_column="contact_id",
    )

    # ABO ELNOUR: opportunity links this interaction to a specific sales opportunity.
    # Nullable because not every interaction is tied to a deal (e.g., support calls).
    opportunity = models.ForeignKey(
        Opportunity,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="interactions",
        db_column="opportunity_id",
    )

    type = models.CharField(max_length=20, choices=InteractionType.choices)
    subject = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    interaction_date = models.DateTimeField()

    class Meta:
        db_table = "interaction"
        ordering = ["-interaction_date"]
        # ABO ELNOUR: indexes for activity timeline and per-employee interaction history
        indexes = [
            models.Index(fields=["interaction_date"], name="idx_interaction_date"),
            models.Index(fields=["employee", "interaction_date"], name="idx_interaction_emp_date"),
            models.Index(fields=["opportunity"], name="idx_interaction_opportunity"),
        ]

    def __str__(self):
        return f"{self.get_type_display()} - {self.subject}"


class CustomerNote(models.Model):
    note_id = models.AutoField(primary_key=True)
    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name="notes",
        db_column="customer_id",
    )
    employee = models.ForeignKey(
        "accounts.Employee",
        on_delete=models.PROTECT,
        related_name="customer_notes",
        db_column="employee_id",
    )
    note_text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "customer_note"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Note for {self.customer} by {self.employee}"
