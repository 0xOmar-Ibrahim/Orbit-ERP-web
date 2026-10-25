from django.urls import path
from .views import (
    CustomerManagement,
    ContactManagement,
    InteractionManagement,
    OpportunityView,
    CustomerNoteView,
    GetOpportunities
)

urlpatterns = [
    # Customer endpoints
    path("customers", CustomerManagement.as_view(), name="customers"),
    path("customers/", CustomerManagement.as_view(), name="customers-slash"),

    # Contact endpoints
    path("contacts", ContactManagement.as_view(), name="contacts"),
    path("contacts/", ContactManagement.as_view(), name="contacts-slash"),

    # Interaction endpoints
    path("interactions", InteractionManagement.as_view(), name="interactions"),
    path("interactions/", InteractionManagement.as_view(), name="interactions-slash"),

    # Interaction endpoints
    path("opportunities_view", GetOpportunities.as_view(), name="opportunities-view"),
    path("opportunities_view/", GetOpportunities.as_view(), name="opportunities-view-slash"),

    # Opportunity endpoints (both singular and plural, with/without trailing slashes and ID routes)
    path("opportunity", OpportunityView.as_view(), name="opportunity"),
    path("opportunity/", OpportunityView.as_view(), name="opportunity-slash"),
    path("opportunity/<int:opportunity_id>", OpportunityView.as_view(), name="opportunity-detail"),
    path("opportunity/<int:opportunity_id>/", OpportunityView.as_view(), name="opportunity-detail-slash"),
    path("opportunities", OpportunityView.as_view(), name="opportunities"),
    path("opportunities/", OpportunityView.as_view(), name="opportunities-slash"),
    path("opportunities/<int:opportunity_id>", OpportunityView.as_view(), name="opportunities-detail"),
    path("opportunities/<int:opportunity_id>/", OpportunityView.as_view(), name="opportunities-detail-slash"),

    # Customer Note endpoints (underscore & hyphen, singular & plural, with/without note_id and nested under customer)
    path("customer_note", CustomerNoteView.as_view(), name="customer_note"),
    path("customer_note/", CustomerNoteView.as_view(), name="customer_note-slash"),
    path("customer_note/<int:note_id>", CustomerNoteView.as_view(), name="customer_note-detail"),
    path("customer_note/<int:note_id>/", CustomerNoteView.as_view(), name="customer_note-detail-slash"),
    path("customer_notes", CustomerNoteView.as_view(), name="customer_notes"),
    path("customer_notes/", CustomerNoteView.as_view(), name="customer_notes-slash"),
    path("customer_notes/<int:note_id>", CustomerNoteView.as_view(), name="customer_notes-detail"),
    path("customer_notes/<int:note_id>/", CustomerNoteView.as_view(), name="customer_notes-detail-slash"),
    path("customer-note", CustomerNoteView.as_view(), name="customer-note"),
    path("customer-note/", CustomerNoteView.as_view(), name="customer-note-slash"),
    path("customer-note/<int:note_id>", CustomerNoteView.as_view(), name="customer-note-detail"),
    path("customer-note/<int:note_id>/", CustomerNoteView.as_view(), name="customer-note-detail-slash"),
    path("customer-notes", CustomerNoteView.as_view(), name="customer-notes"),
    path("customer-notes/", CustomerNoteView.as_view(), name="customer-notes-slash"),
    path("customer-notes/<int:note_id>", CustomerNoteView.as_view(), name="customer-notes-detail"),
    path("customer-notes/<int:note_id>/", CustomerNoteView.as_view(), name="customer-notes-detail-slash"),
    path("customers/<int:customer_id>/notes", CustomerNoteView.as_view(), name="customer-notes-nested"),
    path("customers/<int:customer_id>/notes/", CustomerNoteView.as_view(), name="customer-notes-nested-slash"),
]
