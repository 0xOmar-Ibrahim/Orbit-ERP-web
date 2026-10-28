import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('crm', '0002_leadsource_alter_opportunity_options_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='customer',
            name='assigned_employee',
            field=models.ForeignKey(blank=True, db_column='assigned_employee_id', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='assigned_customers', to=settings.AUTH_USER_MODEL),
        ),
    ]
