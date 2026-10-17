from django.urls import path
from .views import OpportunityView

from .views import CustomerManagement

urlpatterns = [
    path("customers", CustomerManagement.as_view(), name="get_employees"),
    
    path("opportunity", OpportunityView.as_view(), name="opportunity"),
    path("opportunity/", OpportunityView.as_view(), name="opportunity-slash"),
    path("opportunity/<int:opportunity_id>", OpportunityView.as_view(), name="opportunity-detail"),
    path("opportunity/<int:opportunity_id>/", OpportunityView.as_view(), name="opportunity-detail-slash"),
]
