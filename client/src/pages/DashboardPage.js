// client/src/pages/DashboardPage.js
import React, { useState, useEffect, useContext, useCallback } from 'react';
import { getBooks, borrowBook, returnBook } from '../services/api';
import { AuthContext } from '../App';
import BorrowModal from '../components/BorrowModal';
import './DashboardPage.css'; // Import styles

function DashboardPage() {
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionMessage, setActionMessage] = useState({ type: '', text: '' }); // For feedback (success/error)
    const { authState } = useContext(AuthContext);
    const currentUserId = authState.user?.id;

    // State for the modal
    const [showBorrowModal, setShowBorrowModal] = useState(false);
    const [selectedBook, setSelectedBook] = useState(null); // Book object for the modal

    // Use useCallback for fetchBooks to avoid unnecessary re-renders if passed as prop
    const fetchBooks = useCallback(async () => {
        setLoading(true);
        setError(''); // Clear previous errors
        setActionMessage({ type: '', text: '' }); // Clear messages on refresh
        try {
            const response = await getBooks();
            setBooks(response.data || []); // Ensure books is always an array
        } catch (err) {
            console.error("Fetch books error:", err.response?.data || err.message);
            setError(err.response?.data?.message || 'Failed to load books. Please try again later.');
            // Handle specific auth errors if needed (e.g., redirect on 401/403)
            if (err.response?.status === 401 || err.response?.status === 403) {
                 console.warn("Authentication error fetching books.");
                 // Optional: Trigger logout or show specific message
            }
        } finally {
            setLoading(false);
        }
    }, []); // No dependencies, fetchBooks itself doesn't change

    // Fetch books on component mount
    useEffect(() => {
        fetchBooks();
    }, [fetchBooks]); // Dependency array includes fetchBooks

    // --- Modal Handling ---
    const handleOpenBorrowModal = (book) => {
         setSelectedBook(book);
         setShowBorrowModal(true);
         setActionMessage({ type: '', text: '' }); // Clear message when opening modal
    };

    const handleCloseBorrowModal = () => {
         setShowBorrowModal(false);
         setSelectedBook(null);
    };

    // --- Book Actions ---
    const handleConfirmBorrow = async (duration) => {
        if (!selectedBook || !currentUserId) return; // Safety check
        setActionMessage({ type: '', text: '' }); // Clear previous messages
        try {
            const response = await borrowBook(selectedBook.id, duration);
            setActionMessage({ type: 'success', text: response?.data?.message || 'Book borrowed successfully!' });
            handleCloseBorrowModal(); // Close modal on success
            fetchBooks(); // Refresh book list to show updated status
        } catch (err) {
             console.error("Borrow error:", err.response?.data || err.message);
             // Display error message inside the modal or below the grid? Let's put it below.
             setActionMessage({ type: 'error', text: `Borrow failed: ${err.response?.data?.message || 'Could not borrow book.'}` });
             handleCloseBorrowModal(); // Close modal even on error for simplicity here
        }
    };

     const handleReturn = async (bookId, bookTitle) => {
        setActionMessage({ type: '', text: '' });
        // Optional confirmation
        // if (!window.confirm(`Are you sure you want to return "${bookTitle}"?`)) return;
         try {
            // Backend handles checks like if user actually borrowed it, or if payment is needed (though payment is separate step here)
            await returnBook(bookId);
            setActionMessage({ type: 'success', text: `Book "${bookTitle}" returned successfully!` });
            fetchBooks(); // Refresh book list
        } catch (err) {
            console.error("Return error:", err.response?.data || err.message);
            setActionMessage({ type: 'error', text: `Return failed: ${err.response?.data?.message || 'Could not return book.'}` });
        }
    };

    // --- Helper Functions ---
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            // Use toLocaleDateString for user-friendly format
            return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        } catch (e) {
            console.error("Error formatting date:", dateString, e);
            return 'Invalid Date';
        }
    };

    // --- Render Logic ---
    if (loading) return <p className="loading-message">Loading books...</p>;

    return (
        <div className="dashboard-container">
            <h2>Library Catalog</h2>

            {error && <p className="error-message">{error}</p>}
            {actionMessage.text && (
                 <p className={actionMessage.type === 'error' ? 'error-message' : 'success-message'}>
                    {actionMessage.text}
                 </p>
            )}

            {books.length === 0 && !loading && !error && (
                <p>No books found in the library catalog.</p>
            )}

            <div className="book-grid">
                {books.map((book) => (
                    <div key={book.id} className={`book-card ${book.isBorrowed ? 'borrowed' : 'available'}`}>
                         <img
                             src={book.coverImageUrl || 'https://via.placeholder.com/250x350/eee?text=No+Cover'} // Default placeholder
                             alt={`Cover for ${book.title}`}
                             className="book-cover"
                             onError={(e) => { e.target.onerror = null; e.target.src='https://via.placeholder.com/250x350/eee?text=Cover+Error'; }} // Handle image load errors
                         />
                        <div className="book-info">
                            <h3 className="book-title">{book.title}</h3>
                            <p className="book-author">by {book.author || 'Unknown Author'}</p>
                            <div className="book-status">
                                {book.isBorrowed ? (
                                    <div className="borrowed-info">
                                        <p className="status-borrowed">
                                            Borrowed by: {book.borrowedBy === currentUserId ? <strong>You</strong> : (book.borrowerUsername || 'Someone')}
                                        </p>
                                         <p>Due by: <strong>{formatDate(book.dueDate)}</strong></p>
                                        {/* Show return button only if the current logged-in user borrowed it */}
                                        {book.borrowedBy === currentUserId && (
                                             <button
                                                 onClick={() => handleReturn(book.id, book.title)}
                                                 className="return-button"
                                                >
                                                Return
                                                </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="available-info">
                                        <p className="status-available">Available</p>
                                        {/* Button to open the borrow modal */}
                                        <button
                                            onClick={() => handleOpenBorrowModal(book)}
                                            className="borrow-button"
                                            disabled={!authState.isAuthenticated} // Disable if not logged in (shouldn't happen due to ProtectedRoute)
                                            title={authState.isAuthenticated ? "Borrow this book" : "Please log in to borrow"}
                                        >
                                            Borrow
                                            </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Render the BorrowModal conditionally */}
            {showBorrowModal && selectedBook && (
                <BorrowModal
                    bookTitle={selectedBook.title}
                    onConfirm={handleConfirmBorrow}
                    onCancel={handleCloseBorrowModal}
                />
            )}
        </div>
    );
}

export default DashboardPage;