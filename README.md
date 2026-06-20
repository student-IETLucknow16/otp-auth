# MERN Auth with Email OTP Verification

A full authentication system built on MongoDB, Express, React, and Node, with email OTP
verification (via Nodemailer/Gmail) and JWT access + refresh tokens.

## How it works

1. **Register** — user submits name/email/password. A 6-digit OTP is generated, hashed, stored
   on the user document with a 10-minute expiry, and emailed via Nodemailer.
2. **Verify OTP** — user submits the code. If it matches and hasn't expired, `isVerified` is set
   to `true`, and the server issues an access token (15 min) and a refresh token (7 days, stored
   as an httpOnly cookie + persisted on the user document for revocation/rotation).
3. **Login** — only allowed once `isVerified` is true. Issues the same token pair.
4. **Access protected routes** — the React app attaches the access token as
   `Authorization: Bearer <token>` on every request.
5. **Silent refresh** — when an access token expires, an axios interceptor calls
   `/api/auth/refresh-token` (using the httpOnly cookie) to get a new one transparently. The
   refresh token is rotated on every use.
6. **Logout** — clears the refresh token both server-side and as a cookie.

## Project structure

```
mern-auth-otp/
├── backend/      Express API, MongoDB models, JWT + OTP logic
└── frontend/     React (Vite) app: register / verify / login / dashboard
```

## Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env`:
- `MONGO_URI` — your MongoDB connection string (local or Atlas)
- `ACCESS_TOKEN_SECRET` / `REFRESH_TOKEN_SECRET` — generate with:
  `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
- `EMAIL_USER` / `EMAIL_PASS` — a Gmail address and an **App Password** (not your normal Gmail
  password). Create one at Google Account → Security → 2-Step Verification → App passwords.
  Gmail requires 2FA to be enabled to generate app passwords.

Run it:

```bash
npm run dev
```

The API starts on `http://localhost:5000`.

## Frontend setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

The app starts on `http://localhost:5173` and talks to the API at the URL set in
`VITE_API_URL`.

## API reference

| Method | Route                     | Auth required | Description                          |
|--------|----------------------------|----------------|--------------------------------------|
| POST   | `/api/auth/register`       | No             | Create account, sends OTP email      |
| POST   | `/api/auth/verify-otp`     | No             | Verify OTP, returns tokens           |
| POST   | `/api/auth/resend-otp`     | No             | Sends a fresh OTP                    |
| POST   | `/api/auth/login`          | No             | Returns tokens (must be verified)    |
| POST   | `/api/auth/refresh-token`  | Cookie         | Returns a new access token           |
| POST   | `/api/auth/logout`         | Cookie         | Revokes refresh token                |
| GET    | `/api/auth/me`             | Bearer token   | Returns the current user             |

## Security notes already baked in

- Passwords and OTPs are both hashed with bcrypt before being stored — a database leak doesn't
  expose live codes or passwords.
- OTPs expire after 10 minutes and lock after 5 incorrect attempts, forcing a resend.
- Refresh tokens live in an `httpOnly`, `sameSite=lax` cookie scoped to `/api/auth`, so they're
  inaccessible to JavaScript (mitigates XSS token theft) and are rotated on every refresh.
- `/register`, `/resend-otp`, and `/login` are rate-limited per IP to slow down brute-forcing and
  email-bombing.

## Things you may want to add next

- Forgot-password flow (same OTP pattern, different email template)
- Email uniqueness case normalization is already handled (`lowercase: true` on the schema)
- Swap Gmail SMTP for a transactional provider (SendGrid, Resend, Postmark) for production —
  Gmail SMTP has sending limits and isn't meant for production volume
- Account lockout / CAPTCHA after repeated failed logins
- Move from `localStorage`-free in-memory access token (current setup) is already the more
  secure choice — just be aware that a full page refresh briefly relies on the silent-refresh
  call to restore the session
