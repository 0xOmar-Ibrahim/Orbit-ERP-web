from django.urls import path
from .views import OpportunityView
from .views import CustomerManagement, ContactManagement, InteractionManagement

urlpatterns = [

]


urlpatterns = [
    path("customers/", CustomerManagement.as_view(), name="customers"),

    path("contacts/", ContactManagement.as_view(), name="contacts"),
    path("interactions/", InteractionManagement.as_view(), name="interactions"),
    path("customers", CustomerManagement.as_view(), name="get_employees"),

    #Opportunity endpoints
    path("opportunity", OpportunityView.as_view(), name="opportunity"),
    path("opportunity/", OpportunityView.as_view(), name="opportunity-slash"),
    path("opportunity/<int:opportunity_id>", OpportunityView.as_view(), name="opportunity-detail"),
    path("opportunity/<int:opportunity_id>/", OpportunityView.as_view(), name="opportunity-detail-slash")
]
