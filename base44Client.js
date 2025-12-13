import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Create a client with authentication required
export const base44 = createClient({
  appId: "691a647c58594b68e5e2be08", 
  requiresAuth: true // Ensure authentication is required for all operations
});
