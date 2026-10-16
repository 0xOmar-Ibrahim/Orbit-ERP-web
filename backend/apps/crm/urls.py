from django.urls import path
from .views import CustomerManagement, ContactManagement, InteractionManagement

urlpatterns = [
    path("customers/", CustomerManagement.as_view(), name="customers"),
    path("contacts/", ContactManagement.as_view(), name="contacts"),
    path("interactions/", InteractionManagement.as_view(), name="interactions"),
]