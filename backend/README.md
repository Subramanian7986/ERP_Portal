# ERP Portal Backend

## Setup

1. Install dependencies:
   ```
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in your credentials.
3. Create the MySQL database and tables:
   - Create a database named `erp_portal` (or as in your .env)
   - Run the SQL in `schema.sql` to create tables
4. Start the server:
   ```
   node server.js
   ```

## Endpoints

- `POST /api/auth/login`
- `POST /api/auth/otp`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

## Features

- Secure login with role-based access
- MFA/OTP support
- Forgot password with OTP
- Login attempt limiting
- JWT session management
