# PackMoveGO API

Backend API service for PackMoveGO, a professional moving services platform with **dual-server architecture**.

## 🏗️ Architecture

This project uses a **Gateway + Private Server** architecture:

### Gateway Service (Port 3000)
- **Public-facing** API entry point
- Validates frontend requests using API key authentication
- Arcjet protection (bot detection, rate limiting, shield)
- Proxies authenticated requests to private server
- Implements HTTPS enforcement for production domains
- Rate limiting and security headers

### Server Service (Port 3001)
- **Private** business logic layer
- Handles all API routes and database operations
- Not directly accessible from public internet (redirects to gateway)
- Communicates only with gateway in production

## 🚀 Features

- **Dual-Server Architecture**: Gateway handles frontend auth, server handles business logic
- **API Key Authentication**: Frontend validates with `API_KEY_FRONTEND`
- **RESTful API**: Comprehensive endpoints for moving services
- **Real-time Communication**: Socket.IO for live features
- **Security**: Arcjet protection, rate limiting, CORS, Helmet.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT-based user authentication
- **Payments**: Stripe integration
- **Subscriptions**: Auto-renewal with Upstash workflows
- **Email**: Nodemailer for notifications

## 🛠️ Tech Stack

- **Runtime**: Node.js v22.14.0+
- **Framework**: Express.js + TypeScript
- **Database**: MongoDB
- **Security**: Arcjet, Helmet, JWT
- **Real-time**: Socket.IO
- **Payment**: Stripe API
- **Email**: Nodemailer
- **Workflow**: Upstash/workflow
- **Gateway**: http-proxy-middleware

## 📋 Prerequisites

- Node.js (v22.14.0 or higher)
- MongoDB database
- Stripe account (optional)
- SMTP server for emails (optional)
- Arcjet account (optional)
- Upstash account (optional)

## 🔧 Environment Variables

Create a `.env` file in the root directory:

```env
# Core Configuration
NODE_ENV=development
PORT=3001
GATEWAY_PORT=3000

# Frontend API Key (for gateway authentication)
API_KEY_FRONTEND=pmg_frontend_live_sk_a7f8e2d9c1b4x6m9p3q8r5t2w7y1z4a6

# Gateway Configuration
PRIVATE_API_URL=https://localhost:3001

# Database
MONGODB_URI=your_mongodb_uri

# Authentication
JWT_SECRET=your_jwt_secret

# CORS
CORS_ORIGIN=https://www.packmovego.com,https://packmovego.com
CORS_METHODS=GET,POST,PUT,DELETE,OPTIONS
CORS_ALLOWED_HEADERS=Content-Type,Authorization,x-api-key

# Payment (Optional)
STRIPE_SECRET_KEY=your_stripe_secret_key

# Email (Optional)
EMAIL_USER=your_email
EMAIL_PASS=your_email_password

# Arcjet Security (Optional)
ARCJET_KEY=your_arcjet_key
ARCJET_ENV=development

# Upstash Workflow (Optional)
QSTASH_URL=your_qstash_url
QSTASH_TOKEN=your_qstash_token
QSTASH_CURRENT_SIGNING_KEY=your_current_signing_key
QSTASH_NEXT_SIGNING_KEY=your_next_signing_key
```

## 🚀 Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/SereneAura2/PackMoveGO-API.git
   cd PackMoveGO-API
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create and configure `.env` file (see Environment Variables above)

4. Start development servers:
   ```bash
   npm run dev
   ```
   This starts both gateway (port 3000) and server (port 3001) concurrently

## 📦 Development Scripts

```bash
# Development (runs both servers)
npm run dev

# Development (individual servers)
npm run dev:server    # Start server only (port 3001)
npm run dev:gateway   # Start gateway only (port 3000)

# Production Build
npm run build         # Build both services
npm run build:server  # Build server only
npm run build:gateway # Build gateway only

# Production Start
npm start             # Start both built services
npm run start:server  # Start built server
npm run start:gateway # Start built gateway
   ```

## 📦 Deployment

The API supports deployment to Render with automatic builds:

```bash
npm run deploy
```

## 🔒 Security

This project implements multiple security layers:

### Gateway Layer
- **Frontend API Key**: Validates all requests from frontend
- **HTTPS Enforcement**: Blocks HTTP requests to production domains
- **CORS Protection**: Configured allowed origins
- **Rate Limiting**: Token bucket algorithm
- **Security Headers**: Helmet.js configuration

### Server Layer
- **Arcjet Protection**: Shield, bot detection, rate limiting
- **JWT Authentication**: Secure user sessions
- **Input Validation**: All user inputs validated
- **Error Handling**: Centralized error middleware
- **Database Security**: Mongoose with schema validation

## 📝 API Documentation

### Gateway Authentication

All API requests must include the frontend API key:

```bash
# Using x-api-key header
curl -H "x-api-key: pmg_frontend_live_sk_a7f8e2d9c1b4x6m9p3q8r5t2w7y1z4a6" \
  https://api.packmovego.com/v0/nav

# Using Authorization header
curl -H "Authorization: Bearer pmg_frontend_live_sk_a7f8e2d9c1b4x6m9p3q8r5t2w7y1z4a6" \
  https://api.packmovego.com/v0/services
```

### Core Endpoints

**Authentication** (`/auth`, `/v1/auth`)
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /v1/auth/sign-up` - Sign up (Arcjet protected)
- `POST /v1/auth/sign-in` - Sign in (Arcjet protected)
- `GET /auth/me` - Get current user

**Content** (`/v0/*`)
- `GET /v0/nav` - Navigation data
- `GET /v0/services` - Services information
- `GET /v0/blog` - Blog content
- `GET /v0/about` - About page
- `GET /v0/testimonials` - Customer testimonials

**Services** (`/v1/services`)
- `GET /v1/services` - List all services
- `GET /v1/services/analytics` - Service analytics
- `GET /v1/services/:id` - Get service by ID
- `POST /v1/services/:id/quote` - Generate quote

**Subscriptions** (`/v1/subscriptions`)
- `POST /v1/subscriptions` - Create subscription (requires auth)
- `GET /v1/subscriptions/user/:id` - Get user subscriptions (requires auth)

**Health** (`/health`, `/api/health`)
- `GET /health` - Service health check
- `GET /api/health` - Detailed health information

## 📞 Frontend Integration

Frontend should send requests to the **gateway** with the API key:

```javascript
// Frontend API configuration
const API_BASE_URL='https://api.packmovego.com'; // Production
// const API_BASE_URL='https://localhost:3000'; // Development

const API_KEY='pmg_frontend_live_sk_a7f8e2d9c1b4x6m9p3q8r5t2w7y1z4a6';

// Example fetch with x-api-key header
fetch(`${API_BASE_URL}/v0/nav`, {
  headers: {
    'x-api-key': API_KEY,
    'Content-Type': 'application/json'
  }
});

// Or use Authorization header
fetch(`${API_BASE_URL}/v0/services`, {
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  }
});
```

## 🤝 Contributing

Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for details on our code of conduct and contribution guidelines.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔐 Security Policy

Please read [SECURITY.md](SECURITY.md) for details on our security policy and how to report security vulnerabilities.

## 📞 Support

For support, email support@packmovego.com or visit [www.packmovego.com](https://www.packmovego.com)
