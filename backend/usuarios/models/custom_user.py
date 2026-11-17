from typing import ClassVar

from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models.functions import Lower


class CustomUserManager(BaseUserManager):
    use_in_migrations = True

    @staticmethod
    def normalize_email(email):
        if not email:
            raise ValueError("An email address is required.")
        return email.strip().lower()

    @staticmethod
    def normalize_nickname(nickname):
        if nickname is None:
            return ""
        return str(nickname).strip()

    def get_by_natural_key(self, username):
        return self.get(email__iexact=username.strip())

    def _default_nickname_for_email(self, email):
        local_part = email.split("@", 1)[0]
        base = "".join(
            character
            for character in local_part
            if character.isalnum() or character in "_-"
        )[:40]
        if not base:
            base = "user"

        candidate = base
        suffix = 0
        while self.filter(nickname__iexact=candidate).exists():
            suffix += 1
            candidate = f"{base}{suffix}"
        return candidate

    def create_user(self, email, password=None, **extra_fields):
        normalized_email = self.normalize_email(email)
        extra_fields.setdefault("email_verified", True)

        nickname = self.normalize_nickname(extra_fields.get("nickname"))
        if not nickname:
            nickname = self._default_nickname_for_email(normalized_email)
        extra_fields["nickname"] = nickname

        user = self.model(email=normalized_email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("A superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("A superuser must have is_superuser=True.")

        return self.create_user(email, password, **extra_fields)


class CustomUser(AbstractUser):
    username = None
    email = models.EmailField("email address", unique=True)
    nickname = models.CharField(
        max_length=50,
        verbose_name="nickname",
        help_text="Public display name. Unique without case sensitivity.",
    )
    email_verified = models.BooleanField(
        default=False,
        verbose_name="email verified",
    )

    objects = CustomUserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS: ClassVar[list[str]] = []

    class Meta:
        constraints: ClassVar[list] = [
            models.UniqueConstraint(
                Lower("nickname"),
                name="usuarios_customuser_nickname_ci_uniq",
            ),
        ]

    def save(self, *args, **kwargs):
        self.email = CustomUserManager.normalize_email(self.email)
        self.nickname = CustomUserManager.normalize_nickname(self.nickname)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.email
