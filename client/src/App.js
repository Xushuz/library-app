// client/src/App.js
import React, { useState, useEffect, createContext } from 'react';
import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
    Link,
    useNavigate,
    useLocation // Import useLocation
} from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import MyBooksPage from './pages/MyBooksPage'; // Import the new page
import './App.css'; // Main styles

// Create context for authentication state
export const AuthContext = createContext(null);

function App() {
    const [authState, setAuthState] = useState({
        token: null,
        user: null,
        isAuthenticated: false,
        isLoading: true, // Add loading state
    });

    // Function to set auth data in state and local storage
    const setAuthData = (data) => {
        if (data && data.token && data.user) { // Ensure data is valid
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            setAuthState({
                token: data.token,
                user: data.user,
                isAuthenticated: true,
                isLoading: false, // Finished loading/setting auth state
            });
        } else {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setAuthState({
                token: null,
                user: null,
                isAuthenticated: false,
                isLoading: false, // Finished loading/clearing auth state
            });
        }
    };

    // Check local storage on initial load
    useEffect(() => {
        try {
            const token = localStorage.getItem('token');
            const userString = localStorage.getItem('user');
            if (token && userString) {
                 const user = JSON.parse(userString); // Parse user string
                 // Optional: Add token validation step here (e.g., check expiry)
                setAuthState({ token, user, isAuthenticated: true, isLoading: false });
            } else {
                 setAuthState(prev => ({ ...prev, isLoading: false })); // Mark loading as false if no token found
            }
        } catch (error) {
            console.error("Error loading auth state from local storage:", error);
             localStorage.removeItem('token'); // Clear potentially corrupt data
             localStorage.removeItem('user');
             setAuthState(prev => ({ ...prev, isLoading: false }));
        }
    }, []); // Run only once on mount


    // Show loading indicator while checking auth state
    if (authState.isLoading) {
        return <div className="loading-app">Initializing Library...</div>; // Or a proper spinner component
    }

    return (
        // Provide auth state and setter function to children via context
        <AuthContext.Provider value={{ authState, setAuthData }}>
            <Router>
                <div className="App">
                    <NavBar /> {/* Render the navigation bar */}
                    <main className="container">
                        <Routes>
                            {/* Public Routes */}
                            <Route path="/login" element={!authState.isAuthenticated ? <LoginPage /> : <Navigate to="/" replace />} />
                            <Route path="/register" element={!authState.isAuthenticated ? <RegisterPage /> : <Navigate to="/" replace />} />

                            {/* Protected Routes */}
                            <Route path="/" element={
                                <ProtectedRoute> <DashboardPage /> </ProtectedRoute>
                            } />
                            <Route path="/my-books" element={
                                <ProtectedRoute> <MyBooksPage /> </ProtectedRoute>
                            } />
                            <Route path="/admin" element={
                                <ProtectedRoute adminOnly={true}> <AdminPage /> </ProtectedRoute>
                            } />

                            {/* Catch-all redirect for unknown routes */}
                            {/* Redirect to dashboard if logged in, else to login */}
                            <Route path="*" element={<Navigate to={authState.isAuthenticated ? "/" : "/login"} replace />} />
                        </Routes>
                    </main>
                    <Footer /> {/* Optional: Add a site footer */}
                </div>
            </Router>
        </AuthContext.Provider>
    );
}

// --- Navigation Bar Component ---
const NavBar = () => {
    const { authState, setAuthData } = React.useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation(); // Get current location for active link styling

    const handleLogout = () => {
        setAuthData(null); // Clear auth state (removes from local storage)
        navigate('/login'); // Redirect to login page
    };

    // Helper to check if a link is active
    const isActive = (path) => location.pathname === path;

    return (
        <nav className="navbar">
            <Link to="/" className="brand">LibraryApp</Link>
            {/* Links visible only when logged in */}
            {authState.isAuthenticated && (
                <div className="nav-links">
                    <Link to="/" className={isActive('/') ? 'active' : ''}>Catalog</Link>
                    <Link to="/my-books" className={isActive('/my-books') ? 'active' : ''}>My Books</Link>
                    {/* Admin link shown only if user is admin */}
                    {authState.user?.isAdmin && (
                        <Link to="/admin" className={isActive('/admin') ? 'active' : ''}>Admin Panel</Link>
                    )}
                </div>
            )}
             {/* Actions (Login/Register or User Info/Logout) */}
            <div className="nav-actions">
                 {authState.isAuthenticated ? (
                    <>
                     {/* Display username */}
                     <span className="user-greeting">Welcome, {authState.user?.username}!</span>
                     <button onClick={handleLogout} className="logout-button">Logout</button>
                    </>
                 ) : (
                    // Show Login/Register links only if not on those pages already
                    location.pathname !== '/login' && location.pathname !== '/register' && (
                        <>
                            <Link to="/login" className="nav-button">Login</Link>
                            <Link to="/register" className="nav-button register-button">Register</Link>
                        </>
                    )
                )}
            </div>
        </nav>
    );
};


// --- Protected Route Component ---
// Wraps routes that require authentication (and optionally admin rights)
const ProtectedRoute = ({ children, adminOnly = false }) => {
    const { authState } = React.useContext(AuthContext);
    const location = useLocation();

    if (!authState.isAuthenticated) {
        // Redirect them to the /login page, but save the current location they were
        // trying to go to in query parameters so we can send them there after login.
        console.log('ProtectedRoute: Not authenticated, redirecting to login.');
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (adminOnly && !authState.user?.isAdmin) {
        // User is logged in but not an admin. Redirect to dashboard (or a 'Forbidden' page).
        console.log('ProtectedRoute: Not an admin, redirecting to dashboard.');
        return <Navigate to="/" replace />; // Redirect to home/dashboard page
        // Alternatively, show a 'Forbidden' component:
        // return <ForbiddenPage />;
    }

    // User is authenticated (and is admin if required), render the child component
    return children;
};

// --- Simple Footer Component ---
const Footer = () => (
    <footer className="footer">
        <p>&copy; {new Date().getFullYear()} LibraryApp. All rights reserved.</p>
        {/* Add other footer links or info here */}
    </footer>
);

export default App;