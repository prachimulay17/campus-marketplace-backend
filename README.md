# Campus Market — Backend

A production-ready backend API for a campus marketplace where college students can buy and sell pre-owned items. Built with Node.js, Express.js, MongoDB, and JWT authentication.

---

## Features

- **User Authentication** — JWT-based auth with access (15m) + refresh (7d) tokens, OTP email verification
- **Item Management** — Full CRUD with search, filter, pagination, and image upload
- **Wishlist / Favorites** — Save and retrieve wishlisted items
- **Real-time Chat** — Socket.IO with typing indicators, read receipts, message deletion
- **Password Reset** — Forgot/reset/change password endpoints with email delivery
- **Rate Limiting** — Global (100/15min), OTP (3/10min), login (5/15min)
- **Security** — Helmet, CORS, mongo-sanitize, bcryptjs, express-validator
- **API Documentation** — Swagger UI at `/api-docs`

---

## Tech Stack

- **Runtime:** Node.js with ES Modules
- **Framework:** Express 4.18
- **Database:** MongoDB Atlas + Mongoose 8 ODM
- **Auth:** JWT (jsonwebtoken 9) + bcryptjs 2
- **Real-time:** Socket.IO Server 4.8
- **File Upload:** Multer 1 (disk) → Cloudinary 1
- **Email:** Nodemailer (Gmail SMTP) + Brevo API
- **Validation:** express-validator 7
- **Security:** Helmet, CORS, express-mongo-sanitize, express-rate-limit

---

## Project Structure

```
src/
├── index.js              # HTTP server + Socket.IO init
├── app.js                # Express config, middleware stack, routes
├── routes/               # 5 files: user (/api/auth), item, upload, otp, chat
├── controllers/          # 4 files: user, item, otp, chat
├── models/               # 5 files: User, Item, Conversation, Message, OTP
├── middlewares/          # auth, error, multer, rateLimit
├── socket/               # index (JWT auth), connectionHandler, chatHandler
├── utils/                # cloudinary, sendEmail, sendOtpEmail, generateOtp
├── config/               # brevo, swagger
└── db/                   # MongoDB connection
```

---

## Installation

```bash
cd backend
cp sample.env .env        # Edit with real values
npm install
npm run dev               # Port 8000 (or PORT from .env)
```

### Required Environment Variables

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `CLIENT_URL` | CORS origin (e.g. http://localhost:5173) |
| `ACCESS_TOKEN_SECRET` | JWT signing (15m expiry) |
| `REFRESH_TOKEN_SECRET` | JWT signing (7d expiry) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `BREVO_API_KEY` | Transactional email |
| `EMAIL_USER` / `EMAIL_PASS` | Gmail SMTP |
| `FRONTEND_URL` | Password reset link base |

---

## API Endpoints

### Auth (`/api/auth`)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/register` | No | Create account (after OTP verified) |
| POST | `/login` | Rate-limited | Login, returns JWT tokens |
| POST | `/logout` | JWT | Clear session |
| POST | `/refresh-token` | No | Rotate tokens |
| GET | `/me` | JWT | Current user profile |
| PATCH | `/profile` | JWT | Update name/college/avatar |
| PATCH | `/change-password` | JWT | Change password |
| POST | `/forgot-password` | No | Send password reset email |
| POST | `/reset-password/:token` | No | Reset password with token |

### Items (`/api/items`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | No | List items (search, filter, paginate) |
| GET | `/:id` | No | Single item detail |
| GET | `/seller/:sellerId` | No | Items by seller |
| GET | `/user/my-items` | JWT | Current user's items |
| GET | `/user/wishlist` | JWT | Get user's wishlisted items |
| POST | `/:id/wishlist` | JWT | Toggle wishlist (add/remove) |
| POST | `/` | JWT | Create listing |
| PATCH | `/:id` | Owner | Update listing |
| DELETE | `/:id` | Owner | Delete listing |
| PATCH | `/:id/sold` | Owner | Mark as sold |

### Upload (`/api/upload`)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/images` | JWT | Upload 1-5 images to Cloudinary (multipart) |

### OTP (`/api/otp`)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/send` | Rate-limited | Send 6-digit OTP email |
| POST | `/verify` | Rate-limited | Verify OTP (hashed comparison) |

### Chat (`/api/chat`)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/conversations` | JWT | Create or get existing |
| GET | `/conversations` | JWT | List conversations |
| GET | `/conversations/:id/messages` | JWT | Paginated messages |
| PATCH | `/conversations/:id/read` | JWT | Mark read |
| PATCH | `/conversations/:id/hide` | JWT | Soft-delete for user |
| PATCH | `/conversations/:id/unhide` | JWT | Restore hidden |
| DELETE | `/messages/:id` | JWT | Delete forMe or forEveryone |

### Health
| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check |

### API Docs
| Method | Path | Description |
|---|---|---|
| GET | `/api-docs` | Swagger UI |

---

## Database Models

### User
`name`, `email` (unique), `password` (hashed, select:false), `college`, `avatar`, `lastSeen`, `isVerified`, `otp`/`otpExpires`, `passwordResetToken`/`passwordResetExpires`

### Item
`title`, `description`, `price`, `category` (enum), `condition` (enum), `images[]`, `seller` (ref User), `isSold`, `location`, `tags[]`, **`wishlistedBy[]`** (ref User)

### Conversation
`participants[]` (ref User), `item` (ref Item), `lastMessage` (ref Message), `unreadCounts` (Map), `hiddenFor[]` (ref User)

### Message
`conversationId` (ref Conversation), `sender` (ref User), `content`, `status` (enum), `deletedBy[]`, `deletedForAll`

### OTP
`email`, `otp` (hashed), `expiresAt`

---

## Testing

```bash
# Register
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123","college":"Test University"}'

# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Create item (replace TOKEN)
curl -X POST http://localhost:8000/api/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"title":"Test Item","description":"Description","price":25,"category":"Books","condition":"Used","images":["https://example.com/image.jpg"]}'
```

---

## Deployment

Deployed on Render as a Node.js web service. Start command: `npm start`.

Ensure all environment variables are set in the Render dashboard.
