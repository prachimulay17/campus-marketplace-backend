# Campus Marketplace Backend

A production-ready backend API for a campus marketplace where college students can buy and sell pre-owned items. Built with Node.js, Express.js, MongoDB, and JWT authentication.

## 🚀 Features

- **User Authentication**: JWT-based authentication with access and refresh tokens
- **Item Management**: Full CRUD operations for marketplace items
- **Image Upload**: Cloudinary integration for secure image uploads
- **Search & Filtering**: Advanced search and filtering capabilities
- **Security**: Helmet, CORS, input validation, and secure practices
- **Clean Architecture**: Modular code structure with proper separation of concerns

## 🛠️ Tech Stack

- **Runtime**: Node.js with ES Modules
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer + Cloudinary
- **Validation**: Express Validator
- **Security**: Helmet, CORS, bcryptjs
- **Logging**: Morgan

## 📁 Project Structure

```
src/
├── app.js              # Main Express app configuration
├── index.js            # Server entry point
├── controllers/        # Request handlers
│   ├── user.controller.js
│   └── item.controller.js
├── models/            # MongoDB schemas
│   ├── user.model.js
│   └── item.model.js
├── routes/            # API routes
│   ├── user.route.js
│   ├── item.route.js
│   └── upload.route.js
├── middlewares/       # Custom middleware
│   ├── auth.middleware.js
│   ├── error.middleware.js
│   └── multer.middleware.js
├── utils/             # Utility functions
│   └── cloudinary.js
└── db/                # Database configuration
    └── index.js
```

## 🔧 Installation & Setup

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- Cloudinary account for image uploads

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd campus-marketplace/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**

   Copy the sample environment file and configure your variables:

   ```bash
   cp sample.env .env
   ```

   Update `.env` with your configuration:

   ```env
   # Server Configuration
   PORT=8000
   NODE_ENV=development

   # Database
   MONGODB_URI=mongodb://localhost:27017/campus-marketplace

   # JWT Configuration
   ACCESS_TOKEN_SECRET=your_super_secret_access_token_key_here
   REFRESH_TOKEN_SECRET=your_super_secret_refresh_token_key_here
   ACCESS_TOKEN_EXPIRY=15m
   REFRESH_TOKEN_EXPIRY=7d

   # Cloudinary Configuration
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret

   # CORS Configuration
   FRONTEND_URL=http://localhost:5173
   ```

4. **Start MongoDB**

   Make sure MongoDB is running locally or update `MONGODB_URI` for cloud instance.

5. **Run the server**

   ```bash
   # Development mode with auto-restart
   npm run dev

   # Production mode
   npm start
   ```

The server will start on `http://localhost:8000` (or your configured PORT).

## 📚 API Documentation

### Base URL
```
http://localhost:8000/api
```

### Authentication

Most endpoints require authentication. Include the access token in the Authorization header:

```
Authorization: Bearer <access_token>
```

### User Endpoints

#### Register User
```http
POST /api/users/register
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john.doe@college.edu",
  "password": "password123",
  "college": "State University"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "...",
      "name": "John Doe",
      "email": "john.doe@college.edu",
      "college": "State University",
      "avatar": null,
      "createdAt": "..."
    },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

#### Login User
```http
POST /api/users/login
```

**Request Body:**
```json
{
  "email": "john.doe@college.edu",
  "password": "password123"
}
```

#### Get Current User
```http
GET /api/users/me
```

#### Update Profile
```http
PATCH /api/users/profile
```

**Request Body:**
```json
{
  "name": "John Smith",
  "college": "Tech University",
  "avatar": "https://cloudinary.com/image.jpg"
}
```

#### Change Password
```http
PATCH /api/users/change-password
```

**Request Body:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

#### Logout
```http
POST /api/users/logout
```

#### Refresh Token
```http
POST /api/users/refresh-token
```

### Item Endpoints

#### Create Item
```http
POST /api/items
```

**Request Body:**
```json
{
  "title": "Calculus Textbook",
  "description": "Used calculus textbook in excellent condition",
  "price": 50,
  "category": "Books",
  "condition": "Used",
  "images": ["https://cloudinary.com/image1.jpg", "https://cloudinary.com/image2.jpg"],
  "location": "Library Building",
  "tags": ["math", "calculus", "textbook"]
}
```

#### Get All Items (with filtering)
```http
GET /api/items?search=calculus&category=Books&minPrice=10&maxPrice=100&page=1&limit=12
```

**Query Parameters:**
- `search`: Search in title, description, and tags
- `category`: Filter by category (Books, Electronics, Furniture, Clothing, Others)
- `condition`: Filter by condition (New, Like New, Used, Poor)
- `minPrice`: Minimum price
- `maxPrice`: Maximum price
- `location`: Filter by location
- `sortBy`: Sort field (createdAt, price, title)
- `sortOrder`: Sort order (asc, desc)
- `page`: Page number
- `limit`: Items per page

#### Get Single Item
```http
GET /api/items/:id
```

#### Update Item (Seller Only)
```http
PATCH /api/items/:id
```

#### Delete Item (Seller Only)
```http
DELETE /api/items/:id
```

#### Mark Item as Sold (Seller Only)
```http
PATCH /api/items/:id/sold
```

#### Get Items by Seller
```http
GET /api/items/seller/:sellerId
```

#### Get My Items (Authenticated User)
```http
GET /api/items/user/my-items
```

### Upload Endpoints

#### Upload Images
```http
POST /api/upload/images
```

**Content-Type:** `multipart/form-data`

**Form Data:**
- `images`: Multiple image files (max 5, 5MB each)

**Response:**
```json
{
  "success": true,
  "message": "2 image(s) uploaded successfully",
  "data": {
    "images": [
      "https://cloudinary.com/image1.jpg",
      "https://cloudinary.com/image2.jpg"
    ]
  }
}
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcryptjs for password security
- **Input Validation**: Comprehensive validation using express-validator
- **CORS Protection**: Configured CORS for frontend origin
- **Helmet Security**: Security headers and protections
- **Rate Limiting**: Ready for implementation
- **File Upload Security**: Restricted to images only with size limits

## 🗄️ Database Schema

### User Model
```javascript
{
  name: String (required),
  email: String (required, unique),
  password: String (required, hashed),
  college: String (required),
  avatar: String (optional),
  refreshToken: String (optional),
  createdAt: Date,
  updatedAt: Date
}
```

### Item Model
```javascript
{
  title: String (required),
  description: String (required),
  price: Number (required),
  category: String (required, enum),
  condition: String (required, enum),
  images: [String] (required),
  seller: ObjectId (ref: User, required),
  isSold: Boolean (default: false),
  location: String (optional),
  tags: [String] (optional),
  createdAt: Date,
  updatedAt: Date
}
```

## 🧪 Testing

### Manual Testing with cURL

#### Register a new user:
```bash
curl -X POST http://localhost:8000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123",
    "college": "Test University"
  }'
```

#### Login:
```bash
curl -X POST http://localhost:8000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

#### Create an item (replace ACCESS_TOKEN with actual token):
```bash
curl -X POST http://localhost:8000/api/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -d '{
    "title": "Test Item",
    "description": "Test description",
    "price": 25,
    "category": "Books",
    "condition": "Used",
    "images": ["https://example.com/image.jpg"]
  }'
```

## 🚀 Deployment

### Environment Variables for Production

Ensure all environment variables are properly set in production:

- Use strong, unique secrets for JWT tokens
- Configure MongoDB connection string
- Set up Cloudinary credentials
- Set `NODE_ENV=production`
- Configure proper CORS origins

### PM2 Deployment (Recommended)

```bash
npm install -g pm2
pm2 start src/index.js --name "campus-marketplace"
pm2 startup
pm2 save
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 📞 Support

For support or questions, please open an issue in the repository.