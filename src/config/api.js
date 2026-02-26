import Constants from 'expo-constants';

// This grabs the address Metro is using (e.g., 192.168.31.16:8081)
const debuggerHost = Constants.expoConfig?.hostUri;

// Extract just the IP part
const hostIP = debuggerHost ? debuggerHost.split(':')[0] : 'localhost';

// Export the base URL for your backend (assuming it runs on port 3000)
export const API_BASE_URL = "https://annmarie-humid-mateo.ngrok-free.dev";

console.log("🌍 Pro Connection Active:", API_BASE_URL);