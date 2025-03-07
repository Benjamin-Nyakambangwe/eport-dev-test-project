from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FarmTypeViewSet, CropViewSet, FarmerDataViewSet, health_check

router = DefaultRouter()
router.register('farm-types', FarmTypeViewSet)
router.register('crops', CropViewSet)
router.register('farmer-data', FarmerDataViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('health/', health_check, name='health-check'),
]
