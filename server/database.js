// server/database.js
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.resolve(__dirname, 'library.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Error opening database:", err.message);
    } else {
        console.log("Connected to the SQLite database.");
        console.log("Applying database migrations...");
        applyMigrations(); // Apply schema changes safely
        initializeDb();    // Initialize tables and seed data
    }
});

// Function to add columns if they don't exist (simple migration strategy)
const applyMigrations = () => {
    db.serialize(() => {
        // --- Migrations for 'books' table ---
        db.run("ALTER TABLE books ADD COLUMN coverImageUrl TEXT", (err) => {
            if (err && !err.message.includes('duplicate column name')) { // Log only actual errors
                console.error("Migration Error (books.coverImageUrl):", err.message);
            }
        });
        db.run("ALTER TABLE books ADD COLUMN borrowedAt DATE", (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.error("Migration Error (books.borrowedAt):", err.message);
            }
        });
        db.run("ALTER TABLE books ADD COLUMN dueDate DATE", (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.error("Migration Error (books.dueDate):", err.message);
            }
        });

        // --- Migrations for 'users' table (if needed in future) ---
        // Example: db.run("ALTER TABLE users ADD COLUMN balance REAL DEFAULT 0", () => {});

        // Use a final callback to confirm completion (might run slightly before ALTER TABLE finishes)
        db.run("SELECT 1", () => { // Dummy query to ensure serialization point
            console.log("Migrations applied (or columns already existed).");
        });
    });
};


const initializeDb = async () => {
    db.serialize(async () => {
        // Create Users Table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            passwordHash TEXT NOT NULL,
            isAdmin BOOLEAN DEFAULT 0 NOT NULL
        )`, (err) => {
            if (err) console.error("Error creating users table:", err.message);
        });

        // Create Books Table (includes all columns)
        db.run(`CREATE TABLE IF NOT EXISTS books (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            author TEXT,
            isBorrowed BOOLEAN DEFAULT 0 NOT NULL,
            borrowedBy INTEGER,
            coverImageUrl TEXT, -- Added
            borrowedAt DATE,    -- Added
            dueDate DATE,       -- Added
            FOREIGN KEY (borrowedBy) REFERENCES users(id) ON DELETE SET NULL
        )`, (err) => {
            if (err) console.error("Error creating books table:", err.message);
        });

        // --- Seeding ---

        // Seed Admin User (only if not exists)
        const adminUsername = 'admin';
        const adminPassword = 'password123'; // Change in production!
        const saltRounds = 10;

        db.get("SELECT id FROM users WHERE username = ?", [adminUsername], async (err, row) => {
            if (err) {
                console.error("Error checking for admin user:", err.message);
                return;
            }
            if (!row) {
                try {
                    const adminPasswordHash = await bcrypt.hash(adminPassword, saltRounds);
                    db.run("INSERT INTO users (username, passwordHash, isAdmin) VALUES (?, ?, ?)",
                        [adminUsername, adminPasswordHash, 1], (err) => {
                        if (err) {
                            console.error("Error seeding admin user:", err.message);
                        } else {
                            console.log(`Admin user '${adminUsername}' created with password '${adminPassword}'.`);
                        }
                    });
                } catch (hashError) {
                    console.error("Error hashing admin password:", hashError);
                }
            }
        });

         // Seed Sample Books (only if books table is empty, now includes cover images)
        db.get("SELECT COUNT(*) as count FROM books", (err, row) => {
            if (err) {
                console.error("Error checking book count:", err.message);
                return;
            }
            if (row && row.count === 0) {
                const books = [
                    { title: "The Hitchhiker's Guide to the Galaxy", author: "Douglas Adams", coverImageUrl: "https://m.media-amazon.com/images/I/81XSN3hA5gL._SY466_.jpg" },
                    { title: "Pride and Prejudice", author: "Jane Austen", coverImageUrl: "https://m.media-amazon.com/images/I/71Q1tPupKjL._SY466_.jpg" },
                    { title: "To Kill a Mockingbird", author: "Harper Lee", coverImageUrl: "https://m.media-amazon.com/images/I/81aY1lxk+9L._SY466_.jpg" },
                    { title: "1984", author: "George Orwell", coverImageUrl: "https://m.media-amazon.com/images/I/71rpa1-kyvL._SY466_.jpg" },
                    { title: "The Great Gatsby", author: "F. Scott Fitzgerald", coverImageUrl: "https://m.media-amazon.com/images/I/71uy7dM7R+L._SY466_.jpg" } // Added one more
                ];
                // Use parameterized query for safety and efficiency
                const stmt = db.prepare("INSERT INTO books (title, author, coverImageUrl) VALUES (?, ?, ?)");
                books.forEach(book => stmt.run(book.title, book.author, book.coverImageUrl || null)); // Use null if URL is missing
                stmt.finalize((err) => {
                    if (!err) console.log("Sample books seeded with covers.");
                    else console.error("Error seeding books:", err.message);
                });
            }
        });
    });
};

module.exports = db;