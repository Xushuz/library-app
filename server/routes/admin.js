// server/routes/admin.js
const express = require('express');
const db = require('../database');
const authenticateToken = require('../middleware/authMiddleware');
const isAdmin = require('../middleware/adminMiddleware');

const router = express.Router();

// --- Helper function for transaction rollback ---
function rollback(db, res, message, statusCode = 500) {
    console.error("Transaction Error:", message);
    db.run("ROLLBACK;", (rollbackErr) => {
        if (rollbackErr) console.error("Rollback failed:", rollbackErr.message);
        res.status(statusCode).json({ message: message || "Database transaction failed." });
    });
}

// --- Book Management Routes (Mounted under /api/books in server.js) ---
// These routes automatically inherit the prefix and need auth + admin checks

// POST /api/books/add - Add a new book
router.post('/add', authenticateToken, isAdmin, (req, res) => {
    const { title, author, coverImageUrl } = req.body; // Include coverImageUrl

    if (!title || !title.trim()) { // Ensure title is not empty
        return res.status(400).json({ message: "Book title is required." });
    }

    const sql = "INSERT INTO books (title, author, coverImageUrl) VALUES (?, ?, ?)";
    // Trim inputs and use null for empty optional fields
    db.run(sql, [title.trim(), author?.trim() || null, coverImageUrl?.trim() || null], function (err) {
        if (err) {
            console.error("Error adding book:", err.message);
            return res.status(500).json({ message: "Failed to add book." });
        }
        res.status(201).json({ message: "Book added successfully.", bookId: this.lastID });
    });
});

// PATCH /api/books/:id - Edit a book (Route path simplified)
router.patch('/:id', authenticateToken, isAdmin, (req, res) => { // MODIFIED: Removed (\d+)
    const { title, author, coverImageUrl } = req.body;
    const bookId = parseInt(req.params.id, 10); // Parse ID here

    // Validate parsed ID
    if (isNaN(bookId)) {
        return res.status(400).json({ message: "Invalid book ID format." });
    }

    const fieldsToUpdate = {};
    // Check if fields are present in the request body before adding them
    if (title !== undefined) fieldsToUpdate.title = title.trim();
    if (author !== undefined) fieldsToUpdate.author = author.trim() || null; // Allow clearing author
    if (coverImageUrl !== undefined) fieldsToUpdate.coverImageUrl = coverImageUrl.trim() || null; // Allow clearing cover

    if (Object.keys(fieldsToUpdate).length === 0) {
        return res.status(400).json({ message: "No valid fields provided for update (title, author, coverImageUrl)." });
    }
     // Prevent empty title update specifically if title was provided but empty
    if (fieldsToUpdate.title !== undefined && !fieldsToUpdate.title) {
        return res.status(400).json({ message: "Book title cannot be empty." });
    }

    // Build the UPDATE query dynamically
    let sql = "UPDATE books SET ";
    const params = [];
    const setClauses = Object.keys(fieldsToUpdate).map(key => {
        params.push(fieldsToUpdate[key]);
        return `${key} = ?`; // Column names match object keys
    });

    sql += setClauses.join(', ');
    sql += " WHERE id = ?";
    params.push(bookId); // Use the parsed bookId

    db.run(sql, params, function (err) {
        if (err) {
            console.error("Error updating book:", err.message);
            return res.status(500).json({ message: "Failed to update book." });
        }
        if (this.changes === 0) {
            // Check if book exists at all to differentiate between not found and no change
            db.get("SELECT id FROM books WHERE id = ?", [bookId], (err, book) => {
                 if (err) { // Handle potential DB error during check
                    console.error("Error checking book existence after update:", err.message);
                    return res.status(500).json({ message: "Failed to verify book status after update attempt."});
                }
                if (!book) {
                    return res.status(404).json({ message: "Book not found." });
                } else {
                    // Book exists but wasn't updated (maybe data was the same?)
                    return res.status(200).json({ message: "Book data unchanged."}); // Or use 304 Not Modified? 200 is simpler.
                }
            });
        } else {
            res.status(200).json({ message: "Book updated successfully." });
        }
    });
});

// DELETE /api/books/:id - Delete a book (Route path simplified)
router.delete('/:id', authenticateToken, isAdmin, (req, res) => { // MODIFIED: Removed (\d+)
    const bookId = parseInt(req.params.id, 10); // Parse ID here

    // Validate parsed ID
    if (isNaN(bookId)) {
        return res.status(400).json({ message: "Invalid book ID format." });
    }

    const sql = "DELETE FROM books WHERE id = ?";

    db.run(sql, [bookId], function (err) { // Use parsed bookId
        if (err) {
            console.error("Error deleting book:", err.message);
            return res.status(500).json({ message: "Failed to delete book." });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: "Book not found." });
        }
        res.status(200).json({ message: "Book deleted successfully." });
    });
});


// --- User Management Routes (Mounted under /api/admin in server.js) ---
// These also need auth + admin checks

// GET /api/admin/users - List all users (excluding passwords)
router.get('/users', authenticateToken, isAdmin, (req, res) => {
     // Select user info, count their currently borrowed books. Exclude passwordHash.
    const sql = `
        SELECT
            u.id,
            u.username,
            u.isAdmin,
            (SELECT COUNT(*) FROM books WHERE borrowedBy = u.id) as borrowedCount
        FROM users u
        ORDER BY u.username COLLATE NOCASE
    `;
    db.all(sql, [], (err, users) => {
        if (err) {
            console.error("Admin Fetch Users Error:", err.message);
            return res.status(500).json({ message: "Failed to retrieve users." });
        }
          // Convert isAdmin to boolean for consistent frontend use
        const safeUsers = users.map(u => ({ ...u, isAdmin: u.isAdmin === 1 }));
        res.json(safeUsers);
    });
});

 // DELETE /api/admin/users/:userId - Delete a user account (Route path simplified)
 router.delete('/users/:userId', authenticateToken, isAdmin, (req, res) => { // MODIFIED: Removed (\d+)
     const userIdToDelete = parseInt(req.params.userId, 10); // Parse ID here
     const adminUserId = req.user.id; // ID of the admin performing the action

     // Validate parsed ID
    if (isNaN(userIdToDelete)) {
        return res.status(400).json({ message: "Invalid user ID format." });
    }

     // Prevent admin from deleting themselves
    if (userIdToDelete === adminUserId) {
        return res.status(403).json({ message: "Administrators cannot delete their own account." });
    }

    // Use a transaction to ensure atomicity (release books AND delete user)
    db.serialize(() => {
        db.run("BEGIN TRANSACTION;", (err) => {
            if (err) return rollback(db, res, "Begin transaction failed");
        });

        // Step 1: Free up any books currently borrowed by the user being deleted
        const freeBooksSql = `
            UPDATE books
            SET isBorrowed = 0, borrowedBy = NULL, borrowedAt = NULL, dueDate = NULL
            WHERE borrowedBy = ?
        `;
         db.run(freeBooksSql, [userIdToDelete], function (err) { // Use parsed userIdToDelete
            if (err) return rollback(db, res, "Failed to release user's borrowed books.");

             const releasedCount = this.changes; // Store how many books were released
            console.log(`Released ${releasedCount} books for user ${userIdToDelete} during deletion.`);

            // Step 2: Delete the user account
            const deleteUserSql = "DELETE FROM users WHERE id = ?";
             db.run(deleteUserSql, [userIdToDelete], function (err) { // Use parsed userIdToDelete
                if (err) return rollback(db, res, "Failed to delete user account.");

                if (this.changes === 0) {
                     // User ID did not exist, maybe already deleted?
                     // Rollback because the overall state implies the user wasn't found
                    return rollback(db, res, "User not found.", 404);
                }

                // Step 3: If both steps succeeded, commit the transaction
                db.run("COMMIT;", (err) => {
                    if (err) return rollback(db, res, "Commit transaction failed.");
                     // Success
                    res.status(200).json({ message: `User deleted successfully. ${releasedCount} borrowed book(s) were released.` });
                });
            });
        });
    });
});


module.exports = router;