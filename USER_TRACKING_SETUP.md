# 🔍 User Tracking System Setup Guide

## Overview
This system tracks user location, interactions, and provides real-time analytics using Socket.IO. It includes:
- 📍 **Location tracking** (with user permission)
- 🖱️ **Interaction tracking** (clicks, scrolls, form submissions)
- 📄 **Page view tracking**
- 🏓 **Ping/pong for activity monitoring**
- 📊 **Real-time analytics**

## 🚀 Quick Setup

### 1. Backend Setup (Already Done)

Your backend is already configured with the new user tracking system. The following files have been created/updated:

- ✅ `src/util/user-tracker.ts` - User tracking logic
- ✅ `src/server.ts` - Socket.IO integration
- ✅ `frontend-user-tracking.js` - Frontend tracking script
- ✅ `user-tracking-example.html` - Example implementation

### 2. Frontend Integration

#### Step 1: Include Socket.IO Client
Add this to your HTML `<head>`:
```html
<script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
```

#### Step 2: Include User Tracking Script
Add this to your HTML `<head>`:
```html
<script src="frontend-user-tracking.js"></script>
```

#### Step 3: Initialize User Tracking
Add this to your main JavaScript file:
```javascript
// Initialize user tracking
UserTracker.init('http://localhost:3000', {
  enableLocation: true,      // Track user location
  enableInteractions: true,  // Track clicks, scrolls, etc.
  enablePing: true,         // Enable ping/pong for activity
  pingInterval: 30000       // Ping every 30 seconds
});

// Set user info when user logs in
UserTracker.setUserInfo('user123', 'user@example.com', 'customer');
```

## 📊 What Gets Tracked

### Automatic Tracking
- ✅ **Page views** - Every page the user visits
- ✅ **Clicks** - All button and link clicks
- ✅ **Form submissions** - When users submit forms
- ✅ **Scroll events** - User scrolling behavior
- ✅ **API calls** - All fetch requests
- ✅ **Location** - GPS coordinates (with permission)
- ✅ **Device info** - Browser, platform, screen size
- ✅ **Session data** - Session duration, activity

### Manual Tracking
```javascript
// Track custom interactions
UserTracker.trackInteraction('custom_event', {
  category: 'engagement',
  action: 'video_play',
  videoId: 'abc123'
});

// Track page views manually
UserTracker.trackPageView('/about', '/home');
```

## 🎯 Real-Time Features

### 1. Location Tracking
```javascript
// Location is automatically tracked when user grants permission
// You can access location data:
const analytics = UserTracker.getAnalytics();
console.log('Location permission:', analytics.locationPermission);
```

### 2. Activity Monitoring
```javascript
// Ping/pong system keeps track of user activity
// Check if user is active:
const analytics = UserTracker.getAnalytics();
const isActive = Date.now() - analytics.lastActivity < 300000; // 5 minutes
```

### 3. Session Management
```javascript
// Get current session info
const analytics = UserTracker.getAnalytics();
console.log('Session ID:', analytics.sessionId);
console.log('User ID:', analytics.userId);
console.log('Interaction count:', analytics.interactionCount);
```

## 📈 Analytics Dashboard

### Backend Analytics Endpoints

#### Get Active Sessions
```javascript
// Available via Socket.IO admin room
// Real-time data about active users
```

#### Get Session Analytics
```javascript
// Available via Socket.IO admin room
// Session statistics and metrics
```

#### Get Location Analytics
```javascript
// Available via Socket.IO admin room
// Geographic distribution of users
```

## 🔧 Configuration Options

### Frontend Configuration
```javascript
UserTracker.init('http://localhost:3000', {
  enableLocation: true,        // Enable GPS tracking
  enableInteractions: true,    // Enable click/scroll tracking
  enablePing: true,           // Enable activity ping
  pingInterval: 30000,        // Ping interval (ms)
  maxQueueSize: 100           // Max queued interactions
});
```

### Backend Configuration
The backend automatically handles:
- ✅ Socket.IO connections
- ✅ Session management
- ✅ Location caching
- ✅ Interaction recording
- ✅ Real-time broadcasting to admins

## 🛡️ Privacy & Security

### Privacy Features
- ✅ **Location permission required** - GPS only with user consent
- ✅ **Session-based tracking** - No persistent user profiles
- ✅ **Anonymous by default** - No personal data unless provided
- ✅ **Configurable tracking** - Can disable specific features

### Security Features
- ✅ **Socket.IO authentication** - Secure connections
- ✅ **Rate limiting** - Prevents abuse
- ✅ **Data encryption** - Secure transmission
- ✅ **Session isolation** - No cross-session data sharing

## 📱 Mobile Support

### Geolocation
```javascript
// Works on mobile devices
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition((position) => {
    console.log('Location:', position.coords);
  });
}
```

### Touch Events
```javascript
// Automatically tracks touch events on mobile
// Same as click events on desktop
```

## 🎨 Customization Examples

### Custom Event Tracking
```javascript
// Track specific user actions
document.getElementById('signup-button').addEventListener('click', () => {
  UserTracker.trackInteraction('signup_click', {
    source: 'homepage',
    campaign: 'summer2024'
  });
});
```

### Custom Page Views
```javascript
// Track SPA navigation
function navigateToPage(page) {
  UserTracker.trackPageView(page, window.location.pathname);
  // Your navigation logic here
}
```

### Custom User Info
```javascript
// Set user info when they log in
function onUserLogin(userData) {
  UserTracker.setUserInfo(
    userData.id,
    userData.email,
    userData.role
  );
}
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Socket.IO Connection Failed
```javascript
// Check if server is running
// Check CORS configuration
// Check network connectivity
```

#### 2. Location Permission Denied
```javascript
// This is normal - location is optional
// System works without location data
```

#### 3. No Interactions Being Tracked
```javascript
// Check if UserTracker.init() was called
// Check browser console for errors
// Verify Socket.IO connection
```

### Debug Mode
```javascript
// Enable debug logging
UserTracker.init('http://localhost:3000', {
  debug: true
});
```

## 📋 Integration Checklist

- [ ] Include Socket.IO client script
- [ ] Include user tracking script
- [ ] Initialize UserTracker.init()
- [ ] Test connection to backend
- [ ] Test location permission (optional)
- [ ] Test interaction tracking
- [ ] Set up user info when users log in
- [ ] Test on mobile devices
- [ ] Verify privacy compliance

## 🎯 Next Steps

1. **Test the system** using the provided example HTML
2. **Integrate into your frontend** following the setup guide
3. **Customize tracking** based on your needs
4. **Set up admin dashboard** for real-time analytics
5. **Monitor performance** and adjust as needed

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Verify Socket.IO connection
3. Test with the provided example HTML
4. Check backend logs for connection issues

The system is now ready to track user interactions and provide real-time analytics! 🚀 