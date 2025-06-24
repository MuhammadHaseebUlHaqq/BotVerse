# Environment Variables Setup

## Frontend Environment Variables

Create a `.env` file in the `frontend` directory with the following variables:

```env
# Admin Credentials
VITE_ADMIN_USERNAME=your_custom_admin_username
VITE_ADMIN_PASSWORD=your_secure_admin_password

# API Configuration
VITE_API_BASE_URL=http://localhost:8000
```

## Default Values

If no `.env` file is provided, the application will use these default values:

- **Username:** `botverse_admin`
- **Password:** `BotVerse@2024!SecureAdmin`
- **API Base URL:** `http://localhost:8000`

## Security Note

⚠️ **Important:** Always use strong, unique credentials for production environments. The default credentials are provided for development purposes only.

## Example .env file

```env
# Example production configuration
VITE_ADMIN_USERNAME=admin_prod_2024
VITE_ADMIN_PASSWORD=MyVerySecurePassword123!@#
VITE_API_BASE_URL=https://your-api-domain.com
```

## How to use

1. Copy the environment variables above
2. Create a `.env` file in the `frontend` directory
3. Paste and modify the values according to your needs
4. Restart the development server with `npm run dev`

The application will automatically pick up the new credentials from the environment variables. 