# Security Policy

## Supported Versions

We currently support the following versions with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

We take the security of PackMoveGO API seriously. If you believe you have found a security vulnerability, please report it to us as described below.

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to security@packmovego.com.

You should receive a response within 48 hours. If for some reason you do not, please follow up via email to ensure we received your original message.

Please include the following information in your report:

- Type of issue (e.g., buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

This information will help us triage your report more quickly.

## Security Architecture

Our API implements a **dual-layer security architecture**:

### Gateway Layer (Public-Facing)

1. **Frontend API Key Authentication**: All requests must include valid `API_KEY_FRONTEND`
   - Header: `x-api-key: pmg_frontend_live_sk_a7f8e2d9c1b4x6m9p3q8r5t2w7y1z4a6`
   - Or: `Authorization: Bearer pmg_frontend_live_sk_a7f8e2d9c1b4x6m9p3q8r5t2w7y1z4a6`
2. **HTTPS Enforcement**: Blocks HTTP requests to production domains with 403
3. **Rate Limiting**: Token bucket algorithm to prevent abuse
4. **Security Headers**: Helmet.js for comprehensive security headers
5. **CORS Protection**: Whitelist-based origin validation
6. **Request Logging**: All requests logged for security monitoring

### Server Layer (Private)

1. **Arcjet Protection**: Multi-layered security
   - Shield: Protection against common attacks
   - Bot Detection: Allows verified bots (Vercel, Monitor, Postman)
   - Rate Limiting: 5 tokens/10 seconds, capacity 10
2. **JWT Authentication**: Secure token-based user authentication
3. **Input Validation**: All user inputs validated and sanitized
4. **Error Handling**: Centralized error middleware prevents information leakage
5. **Database Security**: Mongoose schema validation and sanitization
6. **Network Isolation**: Server only accessible via gateway in production

### Additional Measures

7. **User Tracking**: Session-based user activity monitoring
8. **Performance Monitoring**: Real-time performance metrics
9. **Workflow Security**: Upstash QStash signature verification
10. **SSL/TLS**: All communications encrypted in production

## Security Updates

Security updates will be released as patch versions (e.g., 1.0.1, 1.0.2) and will be clearly marked in the release notes.

## Best Practices

When using our API, please follow these security best practices:

### For Frontend Developers

1. **API Key Security**
   - Store `API_KEY_FRONTEND` securely (environment variables)
   - Never commit API keys to version control
   - Rotate API keys periodically
   - Use different keys for development and production

2. **HTTPS Only**
   - Always use HTTPS in production
   - Gateway blocks HTTP requests to `api.packmovego.com`
   - Development can use HTTP for localhost

3. **Request Headers**
   - Always include `x-api-key` header in requests
   - Set appropriate `Content-Type` headers
   - Include `Origin` header for CORS validation

4. **Error Handling**
   - Handle 401 Unauthorized responses (invalid API key)
   - Handle 429 Rate Limit responses appropriately
   - Implement retry logic with exponential backoff

### For Backend Developers

1. **Authentication**
   - Use JWT for user authentication
   - Implement proper token refresh logic
   - Validate tokens on protected routes
   - Set appropriate token expiration times

2. **Input Validation**
   - Validate all user inputs
   - Sanitize data before database operations
   - Use express-validator for request validation
   - Implement type checking with TypeScript

3. **Rate Limiting**
   - Respect Arcjet rate limits
   - Implement application-level rate limiting
   - Monitor and adjust limits based on usage

4. **Database Security**
   - Use Mongoose schema validation
   - Implement proper access controls
   - Sanitize query parameters
   - Use parameterized queries

5. **Environment Variables**
   - Never commit `.env` files
   - Use different credentials for dev/prod
   - Rotate secrets regularly
   - Use secure secret management in production

## Contact

For security-related questions or concerns, please contact:

- Email: security@packmovego.com
- Website: https://www.packmovego.com/security 