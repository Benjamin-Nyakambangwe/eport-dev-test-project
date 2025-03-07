# farm_api/models.py

from django.db import models
from django.contrib.auth.models import AbstractUser, Group, Permission
from django.conf import settings


class User(AbstractUser):
    ADMIN = 'admin'
    CLERK = 'clerk'

    ROLE_CHOICES = [
        (ADMIN, 'Admin'),
        (CLERK, 'Clerk'),
    ]

    # Add related_name attributes to avoid clashes with auth.User
    groups = models.ManyToManyField(
        Group,
        verbose_name='groups',
        blank=True,
        help_text='The groups this user belongs to.',
        related_name='farm_user_set',  # Changed from user_set
        related_query_name='farm_user'
    )

    user_permissions = models.ManyToManyField(
        Permission,
        verbose_name='user permissions',
        blank=True,
        help_text='Specific permissions for this user.',
        related_name='farm_user_set',  # Changed from user_set
        related_query_name='farm_user'
    )

    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default=CLERK)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.username

# The rest of your model definitions remain the same


class FarmType(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Crop(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class FarmerData(models.Model):
    farmer_name = models.CharField(max_length=255)
    national_id = models.CharField(max_length=50)
    farm_type = models.ForeignKey(FarmType, on_delete=models.CASCADE)
    crop = models.ForeignKey(Crop, on_delete=models.CASCADE)
    location = models.CharField(max_length=255)

    # Sync fields
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_farmer_data')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    local_id = models.CharField(
        max_length=100, blank=True, null=True)  # For mobile app sync
    is_synced = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.farmer_name} - {self.national_id}"
