# PackMoveGO API

Backend API service for PackMoveGO, a professional moving services platform.

## 🚀 Features

- RESTful API endpoints for moving services
- Secure authentication and authorization
- Rate limiting and IP whitelisting
- CORS configuration for frontend integration
- MongoDB database integration
- Email notifications
- Stripe payment integration

## 🛠️ Tech Stack

- Node.js
- Express.js
- TypeScript
- MongoDB
- JWT Authentication
- Stripe API
- Nodemailer

## 📋 Prerequisites

- Node.js (v22.14.0 or higher)
- MongoDB database
- Stripe account
- SMTP server for emails

## 🔧 Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
NODE_ENV=development
PORT=3000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
STRIPE_SECRET_KEY=your_stripe_secret_key
EMAIL_USER=your_email
EMAIL_PASS=your_email_password
CORS_ORIGIN=https://www.packmovego.com,https://packmovego.com
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

3. Build the project:
   ```bash
   npm run build
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## 📦 Deployment

The API is automatically deployed to Render when changes are pushed to the main branch. The deployment process is managed by GitHub Actions.

## 🔒 Security

- IP whitelisting for authorized domains
- Rate limiting to prevent abuse
- CORS configuration for secure cross-origin requests
- Helmet.js for security headers
- Input validation and sanitization

## 📝 API Documentation

### Authentication Endpoints

- `POST /api/auth/signup` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user

### Navigation Endpoints

- `GET /api/navigation` - Get navigation menu items

### Section Verification

- `POST /api/verify-sections` - Verify page sections

## 🤝 Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔐 Security Policy

Please read [SECURITY.md](SECURITY.md) for details on our security policy and how to report security vulnerabilities.

## 📞 Support

For support, email support@packmovego.com or visit [www.packmovego.com](https://www.packmovego.com)
