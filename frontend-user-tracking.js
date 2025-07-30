/**
 * Frontend User Tracking System
 * Tracks user location, interactions, and provides real-time analytics
 * 
 * Usage:
 * 1. Include this script in your HTML
 * 2. Initialize with: UserTracker.init('http://localhost:3000')
 * 3. The system will automatically track user interactions
 */

class UserTracker {
  constructor() {
    this.socket = null;
    this.sessionId = null;
    this.userId = null;
    this.userEmail = null;
    this.userRole = null;
    this.isConnected = false;
    this.locationPermission = false;
    this.watchId = null;
    this.pingInterval = null;
    this.lastActivity = Date.now();
    this.interactionQueue = [];
    this.deviceInfo = this.getDeviceInfo();
    
    // Bind methods
    this.handleSocketEvents = this.handleSocketEvents.bind(this);
    this.trackInteraction = this.trackInteraction.bind(this);
    this.trackPageView = this.trackPageView.bind(this);
    this.requestLocation = this.requestLocation.bind(this);
    this.startPingInterval = this.startPingInterval.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.handleBeforeUnload = this.handleBeforeUnload.bind(this);
  }

  /**
   * Initialize the user tracker
   * @param {string} serverUrl - Socket.IO server URL
   * @param {Object} options - Configuration options
   */
  init(serverUrl, options = {}) {
    this.serverUrl = serverUrl;
    this.options = {
      enableLocation: true,
      enableInteractions: true,
      enablePing: true,
      pingInterval: 30000, // 30 seconds
      maxQueueSize: 100,
      ...options
    };

    console.log('🔍 UserTracker: Initializing...');
    
    // Generate session ID
    this.sessionId = this.generateSessionId();
    
    // Connect to Socket.IO server
    this.connectSocket();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Start ping interval
    if (this.options.enablePing) {
      this.startPingInterval();
    }
    
    // Request location permission
    if (this.options.enableLocation) {
      this.requestLocation();
    }
    
    // Track initial page view
    this.trackPageView(window.location.pathname, document.referrer);
    
    console.log('✅ UserTracker: Initialized successfully');
  }

  /**
   * Connect to Socket.IO server
   */
  connectSocket() {
    try {
      // Import Socket.IO client if not available
      if (typeof io === 'undefined') {
        console.warn('⚠️ Socket.IO client not found. Please include socket.io-client in your HTML.');
        return;
      }

      this.socket = io(this.serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true
      });

      this.handleSocketEvents();
    } catch (error) {
      console.error('❌ UserTracker: Failed to connect to server:', error);
    }
  }

  /**
   * Handle Socket.IO events
   */
  handleSocketEvents() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('🔌 UserTracker: Connected to server');
      this.isConnected = true;
      
      // Start user session
      this.socket.emit('user:session:start', {
        sessionId: this.sessionId,
        userId: this.userId,
        userEmail: this.userEmail,
        userRole: this.userRole,
        deviceInfo: this.deviceInfo
      });
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 UserTracker: Disconnected from server');
      this.isConnected = false;
    });

    this.socket.on('user:session:created', (data) => {
      console.log('📊 UserTracker: Session created:', data.sessionId);
    });

    this.socket.on('user:pong', (data) => {
      console.log('🏓 UserTracker: Ping response received');
    });

    this.socket.on('error', (error) => {
      console.error('❌ UserTracker: Socket error:', error);
    });
  }

  /**
   * Set up event listeners for user interactions
   */
  setupEventListeners() {
    // Track clicks
    document.addEventListener('click', (event) => {
      this.trackInteraction('click', {
        element: event.target.tagName,
        id: event.target.id,
        className: event.target.className,
        text: event.target.textContent?.substring(0, 50)
      });
    });

    // Track form submissions
    document.addEventListener('submit', (event) => {
      this.trackInteraction('form_submit', {
        formId: event.target.id,
        formAction: event.target.action,
        formMethod: event.target.method
      });
    });

    // Track scroll events (throttled)
    let scrollTimeout;
    document.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.trackInteraction('scroll', {
          scrollY: window.scrollY,
          scrollX: window.scrollX,
          documentHeight: document.documentElement.scrollHeight
        });
      }, 1000);
    });

    // Track page visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    // Track before unload
    window.addEventListener('beforeunload', this.handleBeforeUnload);

    // Track API calls (if using fetch)
    this.interceptFetch();
  }

  /**
   * Track user interaction
   */
  trackInteraction(type, data = {}) {
    const interaction = {
      type,
      page: window.location.pathname,
      element: data.element,
      data
    };

    // Add to queue
    this.interactionQueue.push(interaction);
    
    // Limit queue size
    if (this.interactionQueue.length > this.options.maxQueueSize) {
      this.interactionQueue.shift();
    }

    // Send to server if connected
    if (this.isConnected && this.socket) {
      this.socket.emit('user:interaction', interaction);
    }

    // Update last activity
    this.lastActivity = Date.now();
  }

  /**
   * Track page view
   */
  trackPageView(page, referrer) {
    const pageView = {
      page,
      referrer
    };

    if (this.isConnected && this.socket) {
      this.socket.emit('user:page:view', pageView);
    }

    console.log('📄 UserTracker: Page view tracked:', page);
  }

  /**
   * Request location permission and start tracking
   */
  async requestLocation() {
    if (!navigator.geolocation) {
      console.warn('⚠️ UserTracker: Geolocation not supported');
      return;
    }

    try {
      const position = await this.getCurrentPosition();
      this.locationPermission = true;
      this.updateLocation(position);
      
      // Start watching location
      this.watchId = navigator.geolocation.watchPosition(
        (position) => this.updateLocation(position),
        (error) => console.error('❌ UserTracker: Location error:', error),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    } catch (error) {
      console.warn('⚠️ UserTracker: Location permission denied');
    }
  }

  /**
   * Get current position with promise
   */
  getCurrentPosition() {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      });
    });
  }

  /**
   * Update user location
   */
  updateLocation(position) {
    const location = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: Date.now()
    };

    // Get city/country info (you can integrate with a geocoding service)
    this.getLocationInfo(location).then(locationWithInfo => {
      if (this.isConnected && this.socket) {
        this.socket.emit('user:location:update', locationWithInfo);
      }
    });
  }

  /**
   * Get location info (city, country, etc.)
   * You can integrate with services like Google Geocoding API
   */
  async getLocationInfo(location) {
    try {
      // Example using a free geocoding service
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.latitude}&lon=${location.longitude}`
      );
      const data = await response.json();
      
      return {
        ...location,
        city: data.address?.city || data.address?.town,
        state: data.address?.state,
        country: data.address?.country
      };
    } catch (error) {
      console.warn('⚠️ UserTracker: Failed to get location info');
      return location;
    }
  }

  /**
   * Start ping interval
   */
  startPingInterval() {
    this.pingInterval = setInterval(() => {
      if (this.isConnected && this.socket) {
        this.socket.emit('user:ping');
      }
    }, this.options.pingInterval);
  }

  /**
   * Handle visibility change
   */
  handleVisibilityChange() {
    if (document.hidden) {
      this.trackInteraction('page_hide');
    } else {
      this.trackInteraction('page_show');
    }
  }

  /**
   * Handle before unload
   */
  handleBeforeUnload() {
    this.trackInteraction('page_unload');
  }

  /**
   * Intercept fetch calls to track API interactions
   */
  interceptFetch() {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = Date.now();
      
      try {
        const response = await originalFetch(...args);
        
        // Track successful API call
        this.trackInteraction('api_call', {
          url: args[0],
          method: args[1]?.method || 'GET',
          status: response.status,
          duration: Date.now() - startTime
        });
        
        return response;
      } catch (error) {
        // Track failed API call
        this.trackInteraction('error', {
          type: 'api_error',
          url: args[0],
          error: error.message
        });
        
        throw error;
      }
    };
  }

  /**
   * Set user information
   */
  setUserInfo(userId, userEmail, userRole) {
    this.userId = userId;
    this.userEmail = userEmail;
    this.userRole = userRole;
    
    if (this.isConnected && this.socket) {
      this.socket.emit('user:session:start', {
        sessionId: this.sessionId,
        userId: this.userId,
        userEmail: this.userEmail,
        userRole: this.userRole,
        deviceInfo: this.deviceInfo
      });
    }
  }

  /**
   * Get device information
   */
  getDeviceInfo() {
    return {
      platform: navigator.platform,
      browser: this.getBrowserInfo(),
      screenSize: `${screen.width}x${screen.height}`,
      language: navigator.language,
      userAgent: navigator.userAgent,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine
    };
  }

  /**
   * Get browser information
   */
  getBrowserInfo() {
    const userAgent = navigator.userAgent;
    let browser = 'Unknown';
    
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';
    else if (userAgent.includes('Opera')) browser = 'Opera';
    
    return browser;
  }

  /**
   * Generate session ID
   */
  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Disconnect and cleanup
   */
  disconnect() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    
    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
    }
    
    if (this.socket) {
      this.socket.disconnect();
    }
    
    console.log('👋 UserTracker: Disconnected');
  }

  /**
   * Get analytics data
   */
  getAnalytics() {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      isConnected: this.isConnected,
      locationPermission: this.locationPermission,
      lastActivity: this.lastActivity,
      interactionCount: this.interactionQueue.length,
      deviceInfo: this.deviceInfo
    };
  }
}

// Create global instance
window.UserTracker = new UserTracker();

// Auto-initialize if server URL is provided
if (window.USER_TRACKER_SERVER) {
  window.UserTracker.init(window.USER_TRACKER_SERVER);
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UserTracker;
} 