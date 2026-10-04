from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator

class Customer(models.Model):
    customer_id = models.AutoField(primary_key=True)
    customer_code = models.CharField(max_length=30, unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    phone = models.CharField(max_length=20, blank=True)
    company_name = models.CharField(max_length=150, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    campaign = models.CharField(
        max_length=100,
        blank=True,
        help_text="Where the customer came from",
    )
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
    type = models.CharField(max_length=20, choices=InteractionType.choices)
    subject = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    interaction_date = models.DateTimeField()

    class Meta:
        db_table = "interaction"
        ordering = ["-interaction_date"]

    def __str__(self):
        return f"{self.get_type_display()} - {self.subject}"


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
        on_delete=models.CASCADE,
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
    stage = models.CharField(max_length=20, choices=Stage.choices, default=Stage.LEAD)
    probability = models.PositiveSmallIntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Chance of winning, 0 to 100 (%)",
    )
    expected_close_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.OPEN)

    class Meta:
        db_table = "opportunity"
        ordering = ["-expected_close_date"]

    def __str__(self):
        return self.title


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