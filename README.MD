# Library Book Borrowing System 📚

A web-based application simulating a library book borrowing system, developed as part of the Advanced Software Development module (Component A - Resit). It features a separate frontend (React) and backend (Node.js/Express) communicating via a RESTful API, with data stored in an SQLite database.

The project demonstrates core concepts including user authentication, role-based access control, concurrent data handling, CRUD operations for books and users (admin), and responsive UI design.

## Features ✨

**User Features:**

*   **User Registration:** New users can register online with a unique username and password.
*   **Secure Login:** Existing users can log in securely (passwords are hashed, JWT used for sessions).
*   **Book Catalogue:** View a list/grid of all library books with titles, authors, cover images (or placeholders), and current availability status.
*   **Borrow Books:** Logged-in users can borrow available books.
    *   Select a borrowing duration (1-7 days).
    *   View estimated borrowing cost ($1/day).
*   **My Books Page:** View a dedicated list of currently borrowed books, showing due dates and remaining time/overdue status.
*   **Return Books:** Return books that have been borrowed.
*   **Fine Simulation:** View calculated fines for overdue books and simulate payment to enable returning them.
*   **Logout:** Securely end the user session.

**Admin Features (Requires Admin Login):**

*   **Admin Panel:** Dedicated interface for administrative tasks.
*   **Add Books:** Add new books to the catalogue with title, author (optional), and cover image URL (optional).
*   **Edit Books:** Modify details (title, author, cover URL) of existing books.
*   **Delete Books:** Remove books from the catalogue.
*   **View Users:** See a list of all registered users, their admin status, and the count of books they currently have borrowed (passwords are not displayed).
*   **Delete Users:** Delete user accounts (except the admin's own account). Borrowed books are automatically released upon user deletion (transactional).
*   **Role-Based Access Control:** Admin panel and API endpoints are restricted to users with administrator privileges.

**Non-Functional Features:**

*   **Concurrency Handling:** Backend logic prevents multiple users from borrowing the exact same available book simultaneously using atomic database operations.
*   **Distributed Architecture:** Clear separation between the React frontend and Node.js backend.
*   **Security:** Password hashing (bcryptjs), JWT-based authentication, route protection via middleware.
*   **Responsiveness:** UI adapts to different screen sizes (desktop, tablet, mobile), including horizontal scrolling for wide tables.
*   **Data Integrity:** Uses foreign keys and transactions (for user deletion) to maintain database consistency.

## Technology Stack 🛠️

*   **Frontend:** React (using Create React App), Axios (for API calls), React Router DOM (for routing)
*   **Backend:** Node.js, Express.js (for API framework)
*   **Database:** SQLite (file-based relational database)
*   **Authentication:** JSON Web Tokens (JWT), bcryptjs (for password hashing)
*   **Development:** Concurrently (to run client/server together), Nodemon (for server auto-restart)
*   **Styling:** CSS (with basic responsive design using Flexbox, Grid, Media Queries)

## Screenshots 📸
![A screenshot of the Catalogue page](https://imgur.com/DYgM5Tj.png "The Catalogue")
![A screenshot of the My Books page](https://imgur.com/Ks9TdBI.png "The Catalogue")
![A screenshot of the Admin Panel page](https://imgur.com/O1KaHnu.png "The Catalogue")


## Setup and Installation ⚙️

Follow these steps to set up and run the project locally.

**Prerequisites:**

*   **Node.js & npm:** Ensure Node.js (includes npm) is installed. LTS version (e.g., v18.x or later) recommended. Verify using `node -v` and `npm -v`.
*   **Git:** Optional, but recommended for cloning the repository.

**Steps:**

1.  **Clone Repository:**
    ```bash
    # If using Git
    git clone https://github.com/Xushuz/library-app
    cd library-app
    # Or download and extract the ZIP file and navigate into the 'library-app' directory
    ```

2.  **Install Root Dependencies:** (Installs `concurrently`)
    ```bash
    # Run from the root 'library-app' directory
    npm install
    ```

3.  **Install Server Dependencies:**
    ```bash
    cd server
    npm install
    cd ..
    ```

4.  **Install Client Dependencies:**
    ```bash
    cd client
    npm install
    cd ..
    ```

5.  **Configure Environment Variables (Backend):**
    *   Navigate to the `server/` directory: `cd server`
    *   Create a new file named `.env` (note the leading dot).
    *   Add the following line, replacing `your_very_secure_secret_key_here` with a strong, unique secret:
        ```env
        JWT_SECRET=your_very_secure_secret_key_here
        ```
    *   Save the `.env` file.
    *   Navigate back to the root directory: `cd ..`

6.  **Database Setup:**
    *   The `library.db` file will be created automatically in the `server/` directory when the server starts for the first time.
    *   **Important:** If you make changes to the database schema (`server/database.js`) *after* the database has been created, you may need to **manually delete** the `server/library.db` file before restarting the server to allow it to recreate the database with the latest structure.

## Running the Application 🚀

1.  **Navigate to Root:** Ensure your terminal is in the root `library-app/` directory.
2.  **Start Both Servers:** Run the development script:
    ```bash
    npm run dev
    ```
    This uses `concurrently` to start both the backend Node.js server (typically on port 5001) and the frontend React development server (typically on port 3000).
3.  **Monitor Output:** Wait for messages indicating both servers have started successfully (e.g., `Server running on http://localhost:5001` and `Compiled successfully!`).
4.  **Access Application:** Open your web browser and navigate to:
    `http://localhost:3000`

## Usage / Demo Credentials 🔑

*   **Admin User:**
    *   Username: `admin`
    *   Password: `password123`
*   **Regular User:** You can register a new user through the application's Register page.

## Project Structure 📁

library-app/
├── client/ # React Frontend (Create React App)
│ ├── public/
│ ├── src/ # Main frontend code (components, pages, services, css)
│ └── package.json
├── server/ # Node.js/Express Backend
│ ├── middleware/ # Auth and Admin checks
│ ├── routes/ # API route definitions (auth, books, admin, users)
│ ├── database.js # SQLite setup, schema, seeding
│ ├── server.js # Express server entry point
│ ├── library.db # SQLite database file (created on run)
│ ├── .env # Environment variables (JWT_SECRET) - Gitignored
│ └── package.json
├── .gitignore # Specifies intentionally untracked files
├── package.json # Root dependencies (concurrently) and scripts
└── README.md # This file


## Design Overview 📄

The system follows a standard client-server architecture:

*   **Client (React):** Handles UI rendering and user interaction in the browser.
*   **Server (Node.js/Express):** Provides a RESTful API, handles business logic, interacts with the database.
*   **Database (SQLite):** Stores persistent data.
*   **Communication:** Client and Server communicate via HTTP requests using JSON payloads.

Key design elements like the Component Diagram, ERD, and Sequence Diagrams are documented separately (e.g., within the project report or a dedicated design document).

## Testing 🧪

The application was tested manually using a comprehensive checklist covering:

*   Authentication & Authorization (Login, Register, Roles, Access Control)
*   Book Catalog & Borrowing (Display, Borrowing, Concurrency)
*   Book Returning & My Books Page Functionality
*   Admin Panel Operations (Book CRUD, User Management)
*   Overdue Fine Simulation
*   Basic Security Checks (Password Hashing, Token Usage)
*   UI Responsiveness

Details of the test cases and evidence captured can be found in the accompanying project report.

## Future Improvements / Known Limitations 💡

*   Implement actual e-book delivery/reading functionality.
*   Add search and filtering capabilities to the catalogue.
*   Replace fine simulation with real payment gateway integration.
*   Enhance UI/UX design for a more polished look and feel.
*   Add automated tests (unit, integration).
*   Consider migrating from SQLite to a more scalable database (e.g., PostgreSQL) for larger deployments.
*   Error handling could be more granular in some areas.

---

## Author 🧑‍💻

*   **Xushuz** - (https://github.com/Xushuz)
