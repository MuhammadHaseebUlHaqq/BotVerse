// Authentication Configuration
// These values can be overridden by environment variables

export const AUTH_CONFIG = {
  ADMIN_USERNAME: import.meta.env.VITE_ADMIN_USERNAME || 'botverse_admin',
  ADMIN_PASSWORD: import.meta.env.VITE_ADMIN_PASSWORD || 'BotVerse@2024!SecureAdmin',
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
};

// Default credentials (fallback when env vars are not set)
export const DEFAULT_ADMIN_CREDENTIALS = {
  username: AUTH_CONFIG.ADMIN_USERNAME,
  password: AUTH_CONFIG.ADMIN_PASSWORD
}; 