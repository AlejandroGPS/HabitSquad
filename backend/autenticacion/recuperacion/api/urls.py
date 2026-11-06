from django.urls import path

from .views import PasswordResetRequestView

urlpatterns = [
    path(
        "auth/password-reset/",
        PasswordResetRequestView.as_view(),
        name="password-reset-request",
    ),
]
