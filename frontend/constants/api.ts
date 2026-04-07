/**
 * Central API configuration.
 * 
 * For LOCAL development with tunnel:
 *   Set EXPO_PUBLIC_API_URL in frontend/.env
 *   e.g., EXPO_PUBLIC_API_URL=https://shut-dance-essay-pulling.trycloudflare.com
 * 
 * For PRODUCTION (deployed backend):
 *   Set EXPO_PUBLIC_API_URL to your deployed backend URL
 *   e.g., EXPO_PUBLIC_API_URL=https://receiptflow-api.onrender.com
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'https://receiptflow-0g12.onrender.com';
