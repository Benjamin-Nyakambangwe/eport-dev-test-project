from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from django.db import transaction
from .models import FarmType, Crop, FarmerData, User
from .serializers import FarmTypeSerializer, CropSerializer, FarmerDataSerializer


# Health check endpoint for connectivity testing
@api_view(['GET', 'HEAD'])
@permission_classes([permissions.AllowAny])
def health_check(request):
    """
    A simple health check endpoint to verify the API is online.
    This endpoint doesn't require authentication and is used for connectivity testing.
    """
    return Response(
        {"status": "ok", "message": "API server is running"},
        status=status.HTTP_200_OK
    )


class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.role == User.ADMIN


class IsClerkUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.role == User.CLERK


class FarmTypeViewSet(viewsets.ModelViewSet):
    queryset = FarmType.objects.all()
    serializer_class = FarmTypeSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAdminUser]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]


class CropViewSet(viewsets.ModelViewSet):
    queryset = Crop.objects.all()
    serializer_class = CropSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAdminUser]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]


class FarmerDataViewSet(viewsets.ModelViewSet):
    queryset = FarmerData.objects.all()
    serializer_class = FarmerDataSerializer

    def get_permissions(self):
        if self.action == 'list':
            permission_classes = [permissions.IsAuthenticated]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        user = self.request.user
        if user.role == User.ADMIN:
            return FarmerData.objects.all()
        return FarmerData.objects.filter(created_by=user)

    @action(detail=False, methods=['post'])
    @transaction.atomic
    def sync(self, request):
        data = request.data
        created_count = 0
        updated_count = 0

        for item in data:
            local_id = item.pop('local_id', None)
            if local_id:
                # Check if we already have this record
                try:
                    instance = FarmerData.objects.get(
                        local_id=local_id, created_by=request.user)
                    # Update existing record
                    for key, value in item.items():
                        setattr(instance, key, value)
                    instance.is_synced = True
                    instance.save()
                    updated_count += 1
                except FarmerData.DoesNotExist:
                    # Create new record
                    serializer = self.get_serializer(data=item)
                    serializer.is_valid(raise_exception=True)
                    serializer.save(created_by=request.user,
                                    local_id=local_id, is_synced=True)
                    created_count += 1

        return Response({
            'created': created_count,
            'updated': updated_count,
            'status': 'Sync completed successfully'
        }, status=status.HTTP_200_OK)
