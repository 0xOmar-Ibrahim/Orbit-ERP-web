from django.urls import path
from .views import OpportunityView

urlpatterns = [
    path("opportunity", OpportunityView.as_view(), name="opportunity"),
    path("opportunity/", OpportunityView.as_view(), name="opportunity-slash"),
    path("opportunity/<int:opportunity_id>", OpportunityView.as_view(), name="opportunity-detail"),
    path("opportunity/<int:opportunity_id>/", OpportunityView.as_view(), name="opportunity-detail-slash"),
]
