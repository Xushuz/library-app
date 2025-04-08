// client/src/components/BorrowModal.js
import React, { useState } from 'react';
import './BorrowModal.css'; // CSS file

function BorrowModal({ bookTitle, onConfirm, onCancel }) {
    const [duration, setDuration] = useState(1); // Default to 1 day
    const pricePerDay = 1; // $1 per day cost (can be made dynamic later)
    const minDuration = 1;
    const maxDuration = 7; // Maximum allowed borrowing duration

    const handleDurationChange = (e) => {
        let value = parseInt(e.target.value, 10);
        // Basic validation within the input's change handler
        if (isNaN(value)) {
            value = minDuration; // Reset if invalid input
        } else if (value < minDuration) {
            value = minDuration;
        } else if (value > maxDuration) {
            value = maxDuration;
        }
        setDuration(value);
    };

    // Prevent form submission if using a form element
    const handleSubmit = (e) => {
        e.preventDefault();
        handleConfirmClick();
    };

    const handleConfirmClick = () => {
        // Pass the selected duration back to the parent component
        onConfirm(duration);
    };

    return (
        <div className="modal-overlay" onClick={onCancel}> {/* Close on overlay click */}
            <div className="modal-content" onClick={(e) => e.stopPropagation()}> {/* Prevent closing when clicking inside modal */}
                <h2>Borrow Book</h2>
                <p className="modal-book-title">Book: <strong>{bookTitle}</strong></p>

                <form onSubmit={handleSubmit}>
                    <div className="modal-field">
                        <label htmlFor="duration">Select Duration ({minDuration}-{maxDuration} days):</label>
                        <input
                            type="number"
                            id="duration"
                            value={duration}
                            onChange={handleDurationChange}
                            min={minDuration} // HTML5 min attribute
                            max={maxDuration} // HTML5 max attribute
                            required // HTML5 required attribute
                            className="modal-input"
                        />
                    </div>
                    <p className="modal-cost">
                        Estimated Cost: <strong>${(duration * pricePerDay).toFixed(2)}</strong>
                    </p>
                    <div className="modal-actions">
                        {/* Changed to type="submit" to work with form */}
                        <button type="submit" className="confirm-button modal-button">Confirm Borrow</button>
                        <button type="button" onClick={onCancel} className="cancel-button modal-button">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default BorrowModal;