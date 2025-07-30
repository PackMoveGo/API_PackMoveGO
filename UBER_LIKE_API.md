# PackMoveGo Uber-Like API Documentation

## Overview

This API provides a comprehensive Uber-like moving service with real-time tracking, AI assistant, live chat, and payment processing. The system supports customer quotes, bookings, real-time tracking, and secure payment processing.

## Base URL
- Development: `http://localhost:3000`
- Production: `https://api.packmovego.com`

## Authentication

All endpoints support JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## API Versioning

- **V0**: Legacy content endpoints
- **V1**: Uber-like application endpoints (new)

---

## 🔄 Booking & Quote Management

### Create Quote
**POST** `/v1/bookings/quotes`

Create a new moving quote request.

**Request Body:**
```json
{
  "customerId": "user_001",
  "type": "residential",
  "pickupAddress": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "coordinates": {
      "lat": 40.7505,
      "lng": -73.9934
    }
  },
  "deliveryAddress": {
    "street": "456 Oak Ave",
    "city": "Brooklyn",
    "state": "NY",
    "zipCode": "11201",
    "coordinates": {
      "lat": 40.7021,
      "lng": -73.9866
    }
  },
  "items": [
    {
      "name": "Furniture",
      "quantity": 1,
      "weight": 150,
      "fragile": true
    },
    {
      "name": "Boxes",
      "quantity": 10,
      "weight": 50,
      "fragile": false
    }
  ],
  "requestedDate": "2024-02-15T10:00:00.000Z",
  "specialInstructions": "Handle with care - fragile items"
}
```

**Response:**
```json
{
  "success": true,
  "quote": {
    "id": "quote_1707584400000",
    "customerId": "user_001",
    "status": "pending",
    "type": "residential",
    "estimatedCost": 450.00,
    "distance": 8.5,
    "estimatedDuration": 120,
    "createdAt": "2024-02-10T14:30:00.000Z",
    "expiresAt": "2024-02-17T14:30:00.000Z"
  },
  "message": "Quote created successfully"
}
```

### Get Customer Quotes
**GET** `/v1/bookings/quotes/:customerId`

Retrieve all quotes for a customer.

**Response:**
```json
{
  "success": true,
  "quotes": [
    {
      "id": "quote_1707584400000",
      "status": "pending",
      "type": "residential",
      "estimatedCost": 450.00,
      "createdAt": "2024-02-10T14:30:00.000Z"
    }
  ]
}
```

### Create Booking
**POST** `/v1/bookings/bookings`

Create a booking from a quote.

**Request Body:**
```json
{
  "quoteId": "quote_1707584400000",
  "customerId": "user_001",
  "paymentMethod": "credit_card",
  "specialInstructions": "Handle with care - fragile items"
}
```

**Response:**
```json
{
  "success": true,
  "booking": {
    "id": "booking_1707584400000",
    "customerId": "user_001",
    "moverId": "mover_001",
    "status": "pending",
    "trackingCode": "PMG-2024-001",
    "estimatedCost": 450.00,
    "scheduledDate": "2024-02-15T10:00:00.000Z"
  },
  "tracking": {
    "bookingId": "booking_1707584400000",
    "status": "pending",
    "location": {
      "lat": 40.7505,
      "lng": -73.9934,
      "timestamp": "2024-02-10T14:30:00.000Z"
    }
  },
  "message": "Booking created successfully"
}
```

### Get Booking Details
**GET** `/v1/bookings/bookings/:bookingId`

Get detailed booking information with tracking.

**Response:**
```json
{
  "success": true,
  "booking": {
    "id": "booking_1707584400000",
    "status": "in_progress",
    "pickupAddress": { /* address object */ },
    "deliveryAddress": { /* address object */ },
    "items": [ /* items array */ ],
    "estimatedCost": 450.00,
    "trackingCode": "PMG-2024-001"
  },
  "tracking": {
    "status": "in_transit",
    "location": {
      "lat": 40.7455,
      "lng": -73.9900,
      "timestamp": "2024-02-15T11:30:00.000Z"
    },
    "estimatedArrival": "2024-02-15T12:00:00.000Z"
  }
}
```

### Update Booking Status
**PATCH** `/v1/bookings/bookings/:bookingId/status`

Update booking status (admin/mover only).

**Request Body:**
```json
{
  "status": "in_progress"
}
```

### Update Tracking Location
**PATCH** `/v1/bookings/tracking/:bookingId/location`

Update real-time tracking location (mover app).

**Request Body:**
```json
{
  "lat": 40.7455,
  "lng": -73.9900,
  "estimatedArrival": "2024-02-15T12:00:00.000Z"
}
```

### Get Available Movers
**GET** `/v1/bookings/movers/available`

Get list of available movers.

**Response:**
```json
{
  "success": true,
  "movers": [
    {
      "id": "mover_001",
      "name": "John Smith",
      "rating": 4.8,
      "totalMoves": 156,
      "currentLocation": {
        "lat": 40.7505,
        "lng": -73.9934
      },
      "specialties": ["residential", "fragile_items"],
      "hourlyRate": 45.00
    }
  ]
}
```

---

## 💬 Chat & AI Assistant

### Start Conversation
**POST** `/v1/chat/conversations`

Start a new chat conversation (AI assistant or live chat).

**Request Body:**
```json
{
  "customerId": "user_001",
  "type": "ai_assistant"
}
```

**Response:**
```json
{
  "success": true,
  "conversation": {
    "id": "conv_1707584400000",
    "customerId": "user_001",
    "agentId": "ai_assistant",
    "type": "ai_assistant",
    "status": "active",
    "createdAt": "2024-02-10T14:30:00.000Z"
  },
  "message": "Conversation started successfully"
}
```

### Send Message
**POST** `/v1/chat/messages`

Send a message in a conversation.

**Request Body:**
```json
{
  "conversationId": "conv_1707584400000",
  "content": "Hi, I need help with moving my furniture",
  "senderId": "user_001",
  "senderType": "customer"
}
```

**Response:**
```json
{
  "success": true,
  "message": {
    "id": "msg_1707584400000",
    "senderId": "user_001",
    "senderType": "customer",
    "content": "Hi, I need help with moving my furniture",
    "timestamp": "2024-02-10T14:30:00.000Z"
  },
  "conversation": {
    "id": "conv_1707584400000",
    "status": "active",
    "lastMessageAt": "2024-02-10T14:30:00.000Z"
  }
}
```

### Get Conversation Messages
**GET** `/v1/chat/conversations/:conversationId/messages`

Get all messages in a conversation.

**Response:**
```json
{
  "success": true,
  "conversation": {
    "id": "conv_1707584400000",
    "type": "ai_assistant",
    "status": "active",
    "messages": [
      {
        "id": "msg_001",
        "senderId": "user_001",
        "senderType": "customer",
        "content": "Hi, I need help with moving my furniture",
        "timestamp": "2024-02-10T14:30:00.000Z"
      },
      {
        "id": "msg_002",
        "senderId": "ai_assistant",
        "senderType": "ai",
        "content": "Hello! I'd be happy to help you with your move. I can assist with getting a quote, scheduling, and answering any questions about our moving services. What type of items are you moving?",
        "timestamp": "2024-02-10T14:31:00.000Z"
      }
    ]
  }
}
```

### Get Customer Conversations
**GET** `/v1/chat/conversations/customer/:customerId`

Get all conversations for a customer.

### Close Conversation
**PATCH** `/v1/chat/conversations/:conversationId/close`

Close a conversation.

### Get Available Agents
**GET** `/v1/chat/agents/available`

Get list of available live chat agents.

---

## 💳 Payment Processing

### Create Payment Intent
**POST** `/v1/payments/payment-intent`

Create a Stripe payment intent for a booking.

**Request Body:**
```json
{
  "bookingId": "booking_1707584400000",
  "amount": 450.00,
  "currency": "usd",
  "paymentMethod": "credit_card"
}
```

**Response:**
```json
{
  "success": true,
  "clientSecret": "pi_1234567890_secret_abc123",
  "paymentIntentId": "pi_1234567890",
  "payment": {
    "id": "payment_1707584400000",
    "bookingId": "booking_1707584400000",
    "amount": 450.00,
    "status": "pending"
  }
}
```

### Confirm Payment
**POST** `/v1/payments/confirm-payment`

Confirm a payment after successful processing.

**Request Body:**
```json
{
  "paymentIntentId": "pi_1234567890"
}
```

### Get Payment Status
**GET** `/v1/payments/payments/:paymentId/status`

Get payment status and details.

### Get Booking Payments
**GET** `/v1/payments/bookings/:bookingId/payments`

Get all payments for a booking.

### Refund Payment
**POST** `/v1/payments/refunds`

Process a refund for a payment.

**Request Body:**
```json
{
  "paymentId": "payment_1707584400000",
  "reason": "requested_by_customer"
}
```

### Stripe Webhook
**POST** `/v1/payments/webhook`

Handle Stripe webhook events (payment confirmations, failures, etc.).

---

## 🔌 Real-Time Socket.IO Events

### Connection
Connect to Socket.IO with authentication:
```javascript
const socket = io('https://api.packmovego.com', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### Tracking Events

**Join Tracking Room:**
```javascript
socket.emit('tracking:join', 'booking_1707584400000');
socket.on('tracking:joined', (data) => {
  console.log('Joined tracking room:', data.bookingId);
});
```

**Receive Tracking Updates:**
```javascript
socket.on('tracking:updated', (data) => {
  console.log('Tracking update:', data);
  // Update UI with new location and status
});
```

**Update Tracking (Mover App):**
```javascript
socket.emit('tracking:update', {
  bookingId: 'booking_1707584400000',
  location: { lat: 40.7455, lng: -73.9900 },
  status: 'in_transit'
});
```

### Chat Events

**Join Chat Room:**
```javascript
socket.emit('chat:join', 'conv_1707584400000');
socket.on('chat:joined', (data) => {
  console.log('Joined chat room:', data.conversationId);
});
```

**Send Message:**
```javascript
socket.emit('chat:message', {
  conversationId: 'conv_1707584400000',
  message: 'Hello, I need help!',
  senderType: 'customer'
});
```

**Receive Messages:**
```javascript
socket.on('chat:message', (data) => {
  console.log('New message:', data);
  // Display message in chat UI
});
```

**Typing Indicators:**
```javascript
socket.emit('chat:typing', {
  conversationId: 'conv_1707584400000',
  isTyping: true
});

socket.on('chat:typing', (data) => {
  console.log('User typing:', data);
  // Show typing indicator
});
```

### Mover Location Events

**Update Mover Location (Mover App):**
```javascript
socket.emit('mover:location', {
  moverId: 'mover_001',
  location: { lat: 40.7505, lng: -73.9934 }
});
```

**Receive Mover Location Updates (Admin):**
```javascript
socket.on('mover:location:updated', (data) => {
  console.log('Mover location:', data);
  // Update admin dashboard
});
```

### Notification Events

**Receive Notifications:**
```javascript
socket.on('notification', (data) => {
  console.log('Notification:', data);
  // Display notification to user
});
```

**Admin Notifications:**
```javascript
socket.on('admin:notification', (data) => {
  console.log('Admin notification:', data);
  // Display admin notification
});
```

---

## 🔐 Security Features

### OAuth Integration
- Google OAuth for customer login
- JWT tokens for API authentication
- Token-based Socket.IO authentication

### Payment Security
- Stripe integration with webhook verification
- PCI DSS compliant payment processing
- Secure payment intent creation

### Data Privacy
- Customer data encryption
- GDPR compliance
- Secure data transmission

---

## 📊 Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "success": false,
  "timestamp": "2024-02-10T14:30:00.000Z"
}
```

Common HTTP Status Codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `404`: Not Found
- `500`: Internal Server Error

---

## 🚀 Deployment

### Environment Variables
```bash
# Database
MONGODB_URI=your_mongodb_connection_string

# JWT
JWT_SECRET=your_jwt_secret_key

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Server
PORT=3000
NODE_ENV=production
```

### Render Deployment
The application is deployed on Render as a private service under `api.packmovego.com`.

---

## 📈 Traffic & Performance

- **Expected Daily Traffic**: 1,000 users
- **Real-time Features**: Socket.IO for live tracking and chat
- **Payment Processing**: Stripe integration
- **AI Assistant**: 24/7 automated customer support
- **Live Chat**: Human agent support during business hours

---

## 🔄 API Versioning

- **V0**: Legacy content endpoints (blog, about, services, etc.)
- **V1**: Uber-like application endpoints (bookings, chat, payments, tracking)

All new features are developed under the V1 namespace to maintain backward compatibility. 