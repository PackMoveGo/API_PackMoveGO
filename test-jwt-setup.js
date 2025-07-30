// Test JWT Setup for Frontend Integration
// This file demonstrates how to properly handle JWT tokens

// Example 1: Sending JWT in Authorization header
const sendWithAuthHeader = async (url, token) => {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    credentials: 'include' // Important for cookies
  });
  return response.json();
};

// Example 2: Sending JWT in query parameter
const sendWithQueryParam = async (url, token) => {
  const urlWithToken = `${url}?token=${encodeURIComponent(token)}`;
  const response = await fetch(urlWithToken, {
    method: 'GET',
    credentials: 'include'
  });
  return response.json();
};

// Example 3: Login and store token
const loginAndStoreToken = async (email, password) => {
  const response = await fetch('/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  
  if (data.success) {
    // Store token in localStorage (for Authorization header)
    localStorage.setItem('jwt_token', data.token);
    
    // Token is also automatically stored in httpOnly cookie by server
    console.log('Login successful, token stored');
    return data;
  } else {
    throw new Error(data.message);
  }
};

// Example 4: Making authenticated requests
const makeAuthenticatedRequest = async (url) => {
  // Method 1: Use Authorization header
  const token = localStorage.getItem('jwt_token');
  if (token) {
    return await sendWithAuthHeader(url, token);
  }
  
  // Method 2: Use query parameter
  return await sendWithQueryParam(url, token);
};

// Example 5: Check if user is authenticated
const checkAuthStatus = async () => {
  try {
    const response = await fetch('/auth/me', {
      credentials: 'include'
    });
    return response.json();
  } catch (error) {
    console.error('Auth check failed:', error);
    return { success: false };
  }
};

// Usage examples:
console.log('JWT Setup Examples:');
console.log('1. Login: await loginAndStoreToken(email, password)');
console.log('2. Auth check: await checkAuthStatus()');
console.log('3. Protected request: await makeAuthenticatedRequest(url)');

module.exports = {
  sendWithAuthHeader,
  sendWithQueryParam,
  loginAndStoreToken,
  makeAuthenticatedRequest,
  checkAuthStatus
}; 