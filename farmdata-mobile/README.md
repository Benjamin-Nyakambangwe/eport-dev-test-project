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
