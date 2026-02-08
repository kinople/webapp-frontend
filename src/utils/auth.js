// Token management utilities
export const getToken = () => {
  return localStorage.getItem('authToken');
};

export const setToken = (token) => {
  localStorage.setItem('authToken', token);
  console.log('Token stored:', token ? 'Yes' : 'No'); // Debug log
};

export const removeToken = () => {
  localStorage.removeItem('authToken');
  console.log('Token removed'); // Debug log
};

export const isTokenValid = () => {
  const token = getToken();
  if (!token) return false;
  
  try {
    // Basic JWT token validation (check if it's expired)
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    const isValid = payload.exp > currentTime;
    console.log('Token valid:', isValid, 'Expires:', new Date(payload.exp * 1000)); // Debug log
    return isValid;
  } catch (error) {
    console.error('Invalid token format:', error);
    return false;
  }
};

export const getAuthHeaders = () => {
  const token = getToken();
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
  console.log('Auth headers:', headers); // Debug log
  return headers;
};

// Utility function to check current environment
export const isDevelopment = () => {
  return process.env.NODE_ENV === 'development';
}; 