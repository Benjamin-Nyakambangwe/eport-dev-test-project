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




# FarmData Mobile App

A mobile application  to collect and manage farmer data in both online and offline environments.

## Key Features

- **Online/Offline Operation**: Continue working even without internet connectivity
- **Data Synchronization**: Automatically sync local data when connectivity is restored
- **User Authentication**: Secure login with role-based access (Admin/Clerk)
- **Local Data Storage**: Persistent storage using SQLite database
- **Form Validation**: Ensure data integrity before submission

## Setup Instructions

### Prerequisites

- Node.js (v16 or later)
- npm or yarn
- Expo CLI 
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure API URL:
   - Open `services/api.js` and modify the `API_URL` constant to point to your backend server
   - For Android emulator: `http://10.0.2.2:8000`
   - For iOS simulator: `http://localhost:8000`

### Running the App

Start the development server:

```bash
npx expo start
```

In the output, you'll find options to open the app in a:
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go) on your physical device by scanning the QR code

## Development Notes

### Database Structure

The app uses SQLite for local storage with the following tables:
- `farm_types` - Types of farms
- `crops` - Available crops
- `farmer_data` - Collected farmer information

### Authentication

The app uses JWT token authentication with the backend server and supports offline authentication for previously logged-in users.

### Project Structure

- `/app` - Main application screens and navigation
- `/components` - Reusable UI components
- `/services` - API, database, and authentication services
- `/assets` - Static assets (images, fonts)
- `/styles` - Global styles and theme

## Troubleshooting

If you encounter connection issues with the backend:
1. Ensure the backend server is running
2. Verify the correct API_URL is set for your environment
3. Check if your emulator/simulator has network access
