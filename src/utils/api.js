const API_URL = process.env.API_URL;

// Function to build the full API URL
export const getApiUrl = (path) => `${API_URL}${path}`; 