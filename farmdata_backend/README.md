# FarmData Backend API

Django REST Framework backend for the FarmData Mobile application, providing API endpoints for farmer data management.

## Overview

This backend service provides authentication and data management APIs for the FarmData Mobile application. It handles user authentication, data storage, and synchronization with mobile clients.

## Key Features

- **REST API**: Comprehensive API for mobile app data needs
- **JWT Authentication**: Secure authentication using JSON Web Tokens
- **Custom User Model**: Role-based user management (Admin/Clerk)
- **CORS Support**: Cross-Origin Resource Sharing for mobile client access
- **API Documentation**: Built-in API documentation with Django REST Framework

## Setup Instructions

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- virtualenv (recommended)

### Installation

1. Clone the repository
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows, use: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Apply migrations:
   ```bash
   python manage.py migrate
   ```
5. Create a superuser:
   ```bash
   python manage.py createsuperuser
   ```

### Running the Server

Start the development server:

```bash
python manage.py runserver
```

The API will be available at http://localhost:8000/

## API Endpoints

### Authentication
- `POST /auth/jwt/create/` - Obtain JWT token with username/password
- `POST /auth/jwt/refresh/` - Refresh JWT token
- `POST /auth/users/` - Register a new user
- `GET /auth/users/me/` - Get current user information

### Data Management
- `GET/POST /api/v1/farm-types/` - List or create farm types
- `GET/POST /api/v1/crops/` - List or create crops
- `GET/POST /api/v1/farmer-data/` - List or create farmer data records

### Health Check
- `GET /api/v1/health/` - Server health check endpoint

## Development Notes

### Database

The default configuration uses SQLite. For production, consider using PostgreSQL or MySQL.

### Security

For production deployment:
1. Change the `SECRET_KEY` in settings.py
2. Set `DEBUG = False`
3. Configure proper `ALLOWED_HOSTS`
4. Use HTTPS

## Project Structure

- `/core` - Project settings and main URL configuration
- `/farm_api` - Main application with models, views, and serializers
- `/farm_api/models.py` - Database models
- `/farm_api/views.py` - API endpoints
- `/farm_api/serializers.py` - Data serializers

## Admin Interface

Access the Django admin interface at http://localhost:8000/admin/ using your superuser credentials. 