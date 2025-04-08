// client/src/pages/MyBooksPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { getMyBorrowedBooks, simulatePayment, returnBook } from '../services/api';
// No AuthContext needed here unless accessing user ID directly (which we get from API calls)
import './MyBooksPage.css'; // Import styles

function MyBooksPage() {
    const [borrowedBooks, setBorrowedBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    // Use object for message to include type (success/error)
    const [actionMessage, setActionMessage] = useState({ type: '', text: '' });

    // useCallback for fetchBorrowedBooks
    const fetchBorrowedBooks = useCallback(async () => {
        setLoading(true);
        setError('');
        setActionMessage({ type: '', text: '' }); // Clear message on fetch
        try {
            const response = await getMyBorrowedBooks();
            // Initialize local 'paid' status based on API data (which doesn't have it yet)
            const booksWithLocalStatus = (response.data || []).map(book => ({
                ...book,
                finePaidSimulated: false // Start as not paid locally
            }));
            setBorrowedBooks(booksWithLocalStatus);
        } catch (err) {
             console.error("Fetch borrowed books error:", err.response?.data || err.message);
             setError(err.response?.data?.message || 'Failed to load your borrowed books.');
        } finally {
             setLoading(false);
        }
    }, []); // No dependencies

    useEffect(() => {
         fetchBorrowedBooks();
    }, [fetchBorrowedBooks]); // Dependency array


    // --- Helper Functions ---
    const calculateDaysLeft = (dueDate) => {
        if (!dueDate) return { text: 'N/A', isOverdue: false, days: NaN };
        const now = new Date();
        // Ensure 'due' is also treated as end of day for comparison if needed
        const due = new Date(dueDate);
        // Compare dates directly, time part might matter depending on how dueDate is set
        const diffTime = due.getTime() - now.getTime();
        // Use floor for days left, ceil for days overdue
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            // It's overdue
            const daysOverdue = Math.ceil(Math.abs(diffTime) / (1000 * 60 * 60 * 24));
            return { text: `Overdue by ${daysOverdue} day(s)`, isOverdue: true, days: Math.abs(diffDays) };
        } else if (diffDays === 0 && now.getDate() === due.getDate()) {
             // Check if it's actually today (could be just past midnight)
             return { text: 'Due today', isOverdue: false, days: 0 };
        } else if (diffTime <= 0) {
            // If diffTime is slightly negative but floor(diffDays) is 0, it means overdue today.
             return { text: `Overdue by 1 day(s)`, isOverdue: true, days: 1 };
        }
        else {
            return { text: `${diffDays + 1} day(s) left`, isOverdue: false, days: diffDays + 1 }; // +1 because floor rounds down
        }
    };

     const formatDate = (dateString) => {
         if (!dateString) return 'N/A';
         try {
            return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
         } catch (e) { return 'Invalid Date'; }
     };

    // --- Actions ---
    const handleSimulatePayment = async (bookId, fineAmount, bookTitle) => {
        setActionMessage({ type: '', text: '' });
         if (!window.confirm(`This will simulate paying the fine of $${fineAmount.toFixed(2)} for "${bookTitle}". Proceed?`)) return;

         try {
             // The API call just confirms the possibility, it doesn't change DB state
             const response = await simulatePayment(bookId);
             setActionMessage({ type: 'success', text: `Payment simulated for "${bookTitle}". ${response.data?.message || ''}` });

             // --- IMPORTANT: Update LOCAL state to reflect payment ---
             // This allows the 'Return' button to become enabled immediately.
             setBorrowedBooks(prevBooks => prevBooks.map(book =>
                 book.id === bookId ? { ...book, finePaidSimulated: true } : book
             ));
         } catch (err) {
             console.error("Payment simulation error:", err.response?.data || err.message);
             setActionMessage({ type: 'error', text: `Payment Failed: ${err.response?.data?.message || 'Could not simulate payment.'}` });
         }
    };

     const handleReturn = async (bookId, bookTitle) => {
        setActionMessage({ type: '', text: '' });
        // Optional: Confirmation
        // if (!window.confirm(`Are you sure you want to return "${bookTitle}"?`)) return;

         try {
             await returnBook(bookId);
             setActionMessage({ type: 'success', text: `Book "${bookTitle}" returned successfully!` });
             // Refetch the list to remove the returned book
             fetchBorrowedBooks();
         } catch (err) {
             console.error("Return error:", err.response?.data || err.message);
             setActionMessage({ type: 'error', text: `Return Failed: ${err.response?.data?.message || 'Could not return book.'}` });
         }
     };


    // --- Render Logic ---
    if (loading) return <p className="loading-message">Loading your borrowed books...</p>;

    return (
        <div className="my-books-container">
            <h2>My Borrowed Books</h2>

            {error && <p className="error-message">{error}</p>}
            {actionMessage.text && (
                <p className={actionMessage.type === 'error' ? 'error-message' : 'success-message'}>
                    {actionMessage.text}
                 </p>
            )}

            {borrowedBooks.length === 0 ? (
                <p className="no-books-message">You haven't borrowed any books yet. Visit the <a href="/">Catalog</a> to find your next read!</p>
            ) : (
                <div className="my-books-list">
                    {borrowedBooks.map((book) => {
                         // Recalculate status based on current data
                         const { text: daysLeftText, isOverdue } = calculateDaysLeft(book.dueDate);
                         // Fine details come directly from the enriched book object from the API
                         const fineDetails = (isOverdue && book.fine > 0) ? { amount: book.fine } : null;
                         // Use the local state flag for simulated payment
                         const paymentSimulated = book.finePaidSimulated;

                        return (
                            <div key={book.id} className={`my-book-item ${isOverdue ? 'overdue' : 'on-time'}`}>
                                <img
                                    src={book.coverImageUrl || 'https://via.placeholder.com/100x150/eee?text=No+Cover'}
                                    alt={`Cover for ${book.title}`}
                                    className="my-book-cover-small"
                                    onError={(e) => { e.target.onerror = null; e.target.src='https://via.placeholder.com/100x150/eee?text=Error'; }}
                                />
                                <div className="my-book-details">
                                    <h4 className="my-book-title">{book.title}</h4>
                                    <p className="my-book-author">by {book.author || 'Unknown Author'}</p>
                                    <p>Borrowed: {formatDate(book.borrowedAt)}</p>
                                    <p>Due: <strong>{formatDate(book.dueDate)}</strong></p>
                                    <p className={`status-text ${isOverdue ? 'status-overdue' : 'status-ontime'}`}>
                                        Status: <strong>{daysLeftText}</strong>
                                    </p>
                                    {/* Display Fine Info if Overdue */}
                                    {isOverdue && fineDetails && (
                                        <div className="fine-info">
                                            <p className="fine-amount">Fine Due: ${fineDetails.amount.toFixed(2)}</p>
                                            {!paymentSimulated ? (
                                                 <button
                                                     onClick={() => handleSimulatePayment(book.id, fineDetails.amount, book.title)}
                                                     className="pay-button"
                                                 >
                                                     Simulate Payment
                                                 </button>
                                            ) : (
                                                <p className="paid-message">✔ Payment Acknowledged (Simulated)</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="my-book-actions">
                                    {/* Return Button Logic: Enable if NOT overdue, OR if it IS overdue AND payment has been simulated */}
                                    <button
                                        onClick={() => handleReturn(book.id, book.title)}
                                        className="return-button"
                                        disabled={isOverdue && !paymentSimulated} // Key condition
                                        title={isOverdue && !paymentSimulated ? "Overdue fine must be paid (simulated) before returning" : "Return this book"}
                                    >
                                        Return Book
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default MyBooksPage;