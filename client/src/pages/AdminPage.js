// client/src/pages/AdminPage.js
import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
    getBooks, addBook, deleteBook, updateBook, // Book API calls
    getUsers, deleteUser                       // User API calls
} from '../services/api';
import { AuthContext } from '../App'; // To get current admin ID for self-delete check
import './AdminPage.css'; // Import styles

function AdminPage() {
    // --- State ---
    // Book Data
    const [books, setBooks] = useState([]);
    const [bookLoading, setBookLoading] = useState(true);
    const [bookError, setBookError] = useState(''); // General error fetching books
    const [bookActionMessage, setBookActionMessage] = useState({ type: '', text: '' }); // Success/error for book CRUD

    // User Data
    const [users, setUsers] = useState([]);
    const [userLoading, setUserLoading] = useState(true);
    const [userError, setUserError] = useState(''); // General error fetching users
    const [userActionMessage, setUserActionMessage] = useState({ type: '', text: '' }); // Success/error for user delete

    // Book Form State (for Add/Edit)
    const [isEditing, setIsEditing] = useState(false);
    const [currentBook, setCurrentBook] = useState(null); // Holds the book object being edited
    const [formTitle, setFormTitle] = useState('');
    const [formAuthor, setFormAuthor] = useState('');
    const [formCoverUrl, setFormCoverUrl] = useState('');
    const [formError, setFormError] = useState(''); // Validation/API errors specific to the form

    // Get current user from context to prevent self-deletion
    const { authState } = useContext(AuthContext);
    const currentAdminId = authState.user?.id;

    // --- Data Fetching ---
    // Use useCallback to memoize fetch function
    const fetchAdminData = useCallback(async () => {
        setBookLoading(true); setUserLoading(true);
        setBookError(''); setUserError('');
        setBookActionMessage({ type: '', text: '' }); // Clear action messages on refresh
        setUserActionMessage({ type: '', text: '' });
        setFormError(''); // Clear form error

        try {
            // Fetch books and users in parallel
            const [booksResponse, usersResponse] = await Promise.all([
                getBooks(), // Reusing the standard getBooks endpoint
                getUsers()  // Fetch the user list for admin
            ]);
            setBooks(booksResponse.data || []); // Ensure arrays even if API returns null/undefined
            setUsers(usersResponse.data || []);
        } catch (err) {
            console.error("Admin Fetch Error:", err);
            const message = err.response?.data?.message || 'Failed to load required admin data.';
            // Display error in both sections as it affects the whole page
            setBookError(message);
            setUserError(message);
        } finally {
            setBookLoading(false);
            setUserLoading(false);
        }
    }, []); // No dependencies, function doesn't change

    // Fetch data when component mounts
    useEffect(() => {
        fetchAdminData();
    }, [fetchAdminData]);

    // --- Book Form and Actions ---

    const resetForm = () => {
        setIsEditing(false);
        setCurrentBook(null);
        setFormTitle('');
        setFormAuthor('');
        setFormCoverUrl('');
        setFormError(''); // Clear form-specific error
    };

    // Called when 'Edit' button is clicked on a book row
    const handleEditClick = (book) => {
        setIsEditing(true);
        setCurrentBook(book);
        setFormTitle(book.title);
        setFormAuthor(book.author || ''); // Use empty string if author is null/undefined
        setFormCoverUrl(book.coverImageUrl || ''); // Use empty string if URL is null/undefined
        setFormError(''); // Clear previous form errors
        // Scroll to the top of the page to show the form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Handles submission of the Add/Edit Book form
    const handleBookSubmit = async (e) => {
        e.preventDefault();
        setFormError(''); // Clear previous form error
        setBookActionMessage({ type: '', text: '' }); // Clear general book action message

        // Basic validation
        if (!formTitle.trim()) {
            setFormError('Book title is required.');
            return;
        }
        // Optional URL validation (very basic)
        if (formCoverUrl.trim() && !formCoverUrl.startsWith('http')) {
            setFormError('Please enter a valid URL (starting with http/https) for the cover image, or leave it blank.');
            return;
        }


        // Prepare data, sending null for empty optional fields
        const bookData = {
            title: formTitle.trim(),
            // Send null if author field is whitespace, otherwise send trimmed value
            author: formAuthor.trim() === '' ? null : formAuthor.trim(),
            coverImageUrl: formCoverUrl.trim() === '' ? null : formCoverUrl.trim(),
        };

        try {
            let responseMessage = '';
            if (isEditing && currentBook) {
                // --- Update Existing Book ---
                await updateBook(currentBook.id, bookData);
                responseMessage = `Book "${bookData.title}" updated successfully!`;
            } else {
                // --- Add New Book ---
                await addBook(bookData.title, bookData.author, bookData.coverImageUrl);
                responseMessage = `Book "${bookData.title}" added successfully!`;
            }
            setBookActionMessage({ type: 'success', text: responseMessage });
            resetForm(); // Clear the form on success
            fetchAdminData(); // Refresh book and potentially user list (if counts changed)
        } catch (err) {
            console.error("Book Submit Error:", err.response?.data || err.message);
             // Display error within the form area
            setFormError(err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'add'} book.`);
        }
    };

    // Handles deleting a book
    const handleDeleteBook = async (bookId, bookTitle) => {
         setBookActionMessage({ type: '', text: '' }); // Clear previous messages
         // Confirmation dialog
        if (!window.confirm(`Are you sure you want to permanently delete the book "${bookTitle}" (ID: ${bookId})? This cannot be undone.`)) {
            return;
        }
        try {
            await deleteBook(bookId);
            setBookActionMessage({ type: 'success', text: `Book "${bookTitle}" deleted successfully!` });
            fetchAdminData(); // Refresh list
        } catch (err) {
            console.error("Delete book error:", err.response?.data || err.message);
            setBookActionMessage({ type: 'error', text: `Delete failed: ${err.response?.data?.message || 'Server error.'}` });
        }
    };

    // --- User Actions ---

    // Handles deleting a user
    const handleDeleteUser = async (userId, username) => {
         setUserActionMessage({ type: '', text: '' }); // Clear previous messages

         // Prevent self-deletion
        if (userId === currentAdminId) {
            setUserActionMessage({ type: 'error', text: "Action forbidden: Administrators cannot delete their own account." });
            return;
        }

         // Confirmation dialog
        if (!window.confirm(`DANGER! Are you sure you want to permanently DELETE the user "${username}" (ID: ${userId})?\n\nThis action cannot be undone and will release any books they have borrowed.`)) {
            return;
        }

        try {
            const response = await deleteUser(userId);
            setUserActionMessage({ type: 'success', text: response.data?.message || `User "${username}" deleted successfully!` });
             fetchAdminData(); // Refresh user list and potentially book list (if books were released)
        } catch (err) {
            console.error("Delete user error:", err.response?.data || err.message);
            setUserActionMessage({ type: 'error', text: `Delete failed: ${err.response?.data?.message || 'Server error.'}` });
        }
    };

    // --- Render Logic ---
    return (
        <div className="admin-page-container">
            <h2>Admin Panel</h2>

            {/* --- Book Management Section --- */}
            <section className="admin-section book-management">
                <h3>{isEditing ? `Editing Book (ID: ${currentBook?.id})` : 'Add New Book'}</h3>
                {/* Book Add/Edit Form */}
                <form onSubmit={handleBookSubmit} className="admin-form book-form">
                    {/* Display form error message */}
                    {formError && <p className="error-message form-error">{formError}</p>}

                    <div className="form-field">
                        <label htmlFor="formTitle">Title <span className="required">*</span></label>
                        <input type="text" id="formTitle" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} required />
                    </div>
                    <div className="form-field">
                        <label htmlFor="formAuthor">Author</label>
                        <input type="text" id="formAuthor" value={formAuthor} onChange={(e) => setFormAuthor(e.target.value)} />
                    </div>
                    <div className="form-field">
                        <label htmlFor="formCoverUrl">Cover Image URL</label>
                        <input type="url" id="formCoverUrl" value={formCoverUrl} onChange={(e) => setFormCoverUrl(e.target.value)} placeholder="https://example.com/image.jpg" />
                        {formCoverUrl && <img src={formCoverUrl} alt="Cover preview" className="cover-preview" onError={(e)=>{e.target.style.display='none'}} onLoad={(e)=>{e.target.style.display='block'}}/>}
                    </div>

                    <div className="form-actions">
                        <button type="submit" className="submit-button">{isEditing ? 'Update Book' : 'Add Book'}</button>
                        {isEditing && (
                            <button type="button" onClick={resetForm} className="cancel-button">
                                Cancel Edit
                            </button>
                        )}
                    </div>
                </form>

                <h3 className="list-heading">Manage Existing Books</h3>
                {/* Display book action message (success/error) */}
                {bookActionMessage.text && <p className={bookActionMessage.type === 'error' ? 'error-message' : 'success-message'}>{bookActionMessage.text}</p>}

                {/* Book List Table */}
                {bookLoading ? <p className="loading-message">Loading books...</p> : bookError ? <p className="error-message">{bookError}</p> : (
                    books.length === 0 ? <p>No books found.</p> : (
                        <div className="admin-table-wrapper">
                            <table className="admin-table book-table">
                                <thead>
                                    <tr>
                                        <th>Cover</th>
                                        <th>Title</th>
                                        <th>Author</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {books.map((book) => (
                                        <tr key={book.id}>
                                            <td>
                                                <img src={book.coverImageUrl || 'https://via.placeholder.com/40x60/eee?text=N/A'} alt="Cover" className="admin-list-img" />
                                            </td>
                                            <td>{book.title} <small>(ID: {book.id})</small></td>
                                            <td>{book.author || <span className="text-muted">N/A</span>}</td>
                                            <td>
                                                {book.isBorrowed ?
                                                    <span className="status-borrowed">Borrowed by {book.borrowerUsername || 'Unknown'}</span> :
                                                    <span className="status-available">Available</span>
                                                }
                                            </td>
                                            <td className="actions-cell">
                                                <button onClick={() => handleEditClick(book)} className="edit-button action-button">Edit</button>
                                                <button onClick={() => handleDeleteBook(book.id, book.title)} className="delete-button action-button">Delete</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                )}
            </section>

            <hr className="section-divider" />

            {/* --- User Management Section --- */}
            <section className="admin-section user-management">
                <h3 className="list-heading">Manage Users</h3>
                 {/* Display user action message (success/error) */}
                {userActionMessage.text && <p className={userActionMessage.type === 'error' ? 'error-message' : 'success-message'}>{userActionMessage.text}</p>}

                 {/* User List Table */}
                {userLoading ? <p className="loading-message">Loading users...</p> : userError ? <p className="error-message">{userError}</p> : (
                    users.length === 0 ? <p>No users found.</p> : (
                        <div className="admin-table-wrapper">
                            <table className="admin-table user-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Username</th>
                                        <th>Admin Role?</th>
                                        <th>Books Borrowed</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((user) => (
                                        <tr key={user.id}>
                                            <td>{user.id}</td>
                                            <td>{user.username}</td>
                                            <td>{user.isAdmin ? <span className="role-admin">Yes</span> : 'No'}</td>
                                            <td>{user.borrowedCount}</td>
                                            <td className="actions-cell">
                                                {/* Add view/edit user later if needed */}
                                                <button
                                                    onClick={() => handleDeleteUser(user.id, user.username)}
                                                    className="delete-button action-button"
                                                    disabled={user.id === currentAdminId} // Disable delete for self
                                                    title={user.id === currentAdminId ? "Cannot delete own account" : `Delete user ${user.username}`}
                                                >
                                                    Delete User
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                )}
            </section>
        </div>
    );
}

export default AdminPage;