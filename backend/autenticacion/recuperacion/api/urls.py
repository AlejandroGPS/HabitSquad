from django.urls import path

from .views import (
    EmailVerificationConfirmView,
    EmailVerificationRequestView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
)

urlpatterns = [
    path(
        "auth/password-reset/",
        PasswordResetRequestView.as_view(),
        name="password-reset-request",
    ),
    path(
        "auth/password-reset/confirm/",
        PasswordResetConfirmView.as_view(),
        name="password-reset-confirm",
    ),
    path(
        "auth/email-verification/",
        EmailVerificationRequestView.as_view(),
        name="email-verification-request",
    ),
    path(
        "auth/email-verification/confirm/",
        EmailVerificationConfirmView.as_view(),
        name="email-verification-confirm",
    ),
]
