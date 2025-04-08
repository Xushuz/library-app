// client/src/services/api.js
import axios from 'axios';

// Ensure this points to your backend server!
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Create an Axios instance with default settings
const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// --- Axios Request Interceptor ---
// Automatically attaches the JWT token (if available) to Authorization header
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            // Ensure the header name matches what the backend expects ('Authorization')
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        // Handle request configuration errors
        console.error("Axios request interceptor error:", error);
        return Promise.reject(error);
    }
);

// --- Axios Response Interceptor (Optional but Recommended) ---
// Handles common responses, like 401/403 for auth issues
apiClient.interceptors.response.use(
    (response) => {
        // Any status code within the range of 2xx cause this function to trigger
        return response;
    },
    (error) => {
        // Any status codes outside the range of 2xx cause this function to trigger
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.error('API Error Response:', error.response.status, error.response.data);

            if (error.response.status === 401 || error.response.status === 403) {
                 // Handle unauthorized access or forbidden access
                 // Example: Redirect to login or clear local storage
                console.warn(`Auth error (${error.response.status}): Token might be invalid or expired.`);
                 // Uncomment to force logout on auth errors:
                 // localStorage.removeItem('token');
                 // localStorage.removeItem('user');
                 // window.location.href = '/login'; // Force redirect
            }
        } else if (error.request) {
            // The request was made but no response was received
            console.error('API No Response:', error.request);
            // This usually means the backend server is down or unreachable
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error('API Request Setup Error:', error.message);
        }
        // Return the error so components can handle it in their catch blocks
        return Promise.reject(error);
    }
);


// --- Auth Service ---
export const registerUser = (username, password) => {
    return apiClient.post('/register', { username, password });
};

export const loginUser = (username, password) => {
    return apiClient.post('/login', { username, password });
};

// --- Book Service (User-facing) ---
export const getBooks = () => {
    return apiClient.get('/books'); // Gets the catalog for dashboard
};

export const borrowBook = (bookId, duration) => {
    return apiClient.post('/books/borrow', { bookId, duration });
};

export const returnBook = (bookId) => {
    return apiClient.post('/books/return', { bookId });
};

// --- User Service (Current User) ---
export const getMyBorrowedBooks = () => {
    // Endpoint gets books specifically borrowed by the authenticated user
    return apiClient.get('/users/me/borrowed');
};

export const simulatePayment = (bookId) => {
    // Endpoint to simulate paying the fine for a specific book
    return apiClient.post(`/users/me/pay/${bookId}`);
};

// --- Admin Book Service ---
export const addBook = (title, author, coverImageUrl) => {
    return apiClient.post('/books/add', { title, author, coverImageUrl });
};

export const updateBook = (bookId, bookData) => {
    // bookData should be an object like { title: '...', author: '...', coverImageUrl: '...' }
    // Only include fields that are being changed.
    return apiClient.patch(`/books/${bookId}`, bookData);
};

export const deleteBook = (bookId) => {
     return apiClient.delete(`/books/${bookId}`);
};

// --- Admin User Service ---
export const getUsers = () => {
    // Gets the list of all users for the admin panel
    return apiClient.get('/admin/users');
};

export const deleteUser = (userId) => {
    // Deletes a specific user account (must not be self)
    return apiClient.delete(`/admin/users/${userId}`);
};

// Export the configured instance if needed directly (optional)
export default apiClient;