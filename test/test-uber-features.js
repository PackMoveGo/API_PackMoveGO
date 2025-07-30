const io = require('socket.io-client');
const fetch = require('node-fetch');

console.log('🧪 Testing Uber-like features...\n');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:3000';

// Test data
const testCustomer = {
  id: 'user_001',
  email: 'test@packmovego.com'
};

const testQuote = {
  customerId: 'user_001',
  type: 'residential',
  pickupAddress: {
    street: '123 Main St',
    city: 'New York',
    state: 'NY',
    zipCode: '10001',
    coordinates: {
      lat: 40.7505,
      lng: -73.9934
    }
  },
  deliveryAddress: {
    street: '456 Oak Ave',
    city: 'Brooklyn',
    state: 'NY',
    zipCode: '11201',
    coordinates: {
      lat: 40.7021,
      lng: -73.9866
    }
  },
  items: [
    {
      name: 'Furniture',
      quantity: 1,
      weight: 150,
      fragile: true
    },
    {
      name: 'Boxes',
      quantity: 10,
      weight: 50,
      fragile: false
    }
  ],
  requestedDate: '2024-02-15T10:00:00.000Z',
  specialInstructions: 'Handle with care - fragile items'
};

const testBooking = {
  quoteId: 'quote_1707584400000',
  customerId: 'user_001',
  paymentMethod: 'credit_card',
  specialInstructions: 'Handle with care - fragile items'
};

const testChat = {
  customerId: 'user_001',
  type: 'ai_assistant'
};

const testMessage = {
  conversationId: 'conv_1707584400000',
  content: 'Hi, I need help with moving my furniture',
  senderId: 'user_001',
  senderType: 'customer'
};

// API Test Functions
async function testQuoteCreation() {
  console.log('📝 Testing quote creation...');
  try {
    const response = await fetch(`${BASE_URL}/v1/bookings/quotes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testQuote)
    });
    
    const data = await response.json();
    if (response.ok) {
      console.log('✅ Quote created successfully:', data.quote.id);
      return data.quote.id;
    } else {
      console.log('❌ Quote creation failed:', data.error);
      return null;
    }
  } catch (error) {
    console.log('❌ Quote creation error:', error.message);
    return null;
  }
}

async function testCustomerQuotes() {
  console.log('📋 Testing customer quotes retrieval...');
  try {
    const response = await fetch(`${BASE_URL}/v1/bookings/quotes/${testCustomer.id}`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Customer quotes retrieved:', data.quotes.length, 'quotes');
    } else {
      console.log('❌ Customer quotes retrieval failed:', data.error);
    }
  } catch (error) {
    console.log('❌ Customer quotes error:', error.message);
  }
}

async function testBookingCreation() {
  console.log('📦 Testing booking creation...');
  try {
    const response = await fetch(`${BASE_URL}/v1/bookings/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testBooking)
    });
    
    const data = await response.json();
    if (response.ok) {
      console.log('✅ Booking created successfully:', data.booking.id);
      return data.booking.id;
    } else {
      console.log('❌ Booking creation failed:', data.error);
      return null;
    }
  } catch (error) {
    console.log('❌ Booking creation error:', error.message);
    return null;
  }
}

async function testBookingDetails(bookingId) {
  if (!bookingId) return;
  
  console.log('📋 Testing booking details retrieval...');
  try {
    const response = await fetch(`${BASE_URL}/v1/bookings/bookings/${bookingId}`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Booking details retrieved:', data.booking.trackingCode);
    } else {
      console.log('❌ Booking details retrieval failed:', data.error);
    }
  } catch (error) {
    console.log('❌ Booking details error:', error.message);
  }
}

async function testAvailableMovers() {
  console.log('🚚 Testing available movers...');
  try {
    const response = await fetch(`${BASE_URL}/v1/bookings/movers/available`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Available movers retrieved:', data.movers.length, 'movers');
    } else {
      console.log('❌ Available movers retrieval failed:', data.error);
    }
  } catch (error) {
    console.log('❌ Available movers error:', error.message);
  }
}

async function testChatConversation() {
  console.log('💬 Testing chat conversation creation...');
  try {
    const response = await fetch(`${BASE_URL}/v1/chat/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testChat)
    });
    
    const data = await response.json();
    if (response.ok) {
      console.log('✅ Chat conversation created:', data.conversation.id);
      return data.conversation.id;
    } else {
      console.log('❌ Chat conversation creation failed:', data.error);
      return null;
    }
  } catch (error) {
    console.log('❌ Chat conversation error:', error.message);
    return null;
  }
}

async function testChatMessage(conversationId) {
  if (!conversationId) return;
  
  console.log('💬 Testing chat message sending...');
  try {
    const response = await fetch(`${BASE_URL}/v1/chat/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...testMessage,
        conversationId
      })
    });
    
    const data = await response.json();
    if (response.ok) {
      console.log('✅ Chat message sent:', data.message.id);
    } else {
      console.log('❌ Chat message sending failed:', data.error);
    }
  } catch (error) {
    console.log('❌ Chat message error:', error.message);
  }
}

async function testChatMessages(conversationId) {
  if (!conversationId) return;
  
  console.log('💬 Testing chat messages retrieval...');
  try {
    const response = await fetch(`${BASE_URL}/v1/chat/conversations/${conversationId}/messages`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Chat messages retrieved:', data.conversation.messages.length, 'messages');
    } else {
      console.log('❌ Chat messages retrieval failed:', data.error);
    }
  } catch (error) {
    console.log('❌ Chat messages error:', error.message);
  }
}

async function testAvailableAgents() {
  console.log('👥 Testing available agents...');
  try {
    const response = await fetch(`${BASE_URL}/v1/chat/agents/available`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Available agents retrieved:', data.agents.length, 'agents');
    } else {
      console.log('❌ Available agents retrieval failed:', data.error);
    }
  } catch (error) {
    console.log('❌ Available agents error:', error.message);
  }
}

// Socket.IO Test Functions
function testSocketConnection() {
  console.log('🔌 Testing Socket.IO connection...');
  
  const socket = io(SOCKET_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
    }
  });

  socket.on('connect', () => {
    console.log('✅ Socket.IO connected successfully');
    console.log('🆔 Socket ID:', socket.id);
    
    // Test tracking events
    testTrackingEvents(socket);
    
    // Test chat events
    testChatEvents(socket);
    
    // Disconnect after 5 seconds
    setTimeout(() => {
      console.log('🔌 Disconnecting Socket.IO...');
      socket.disconnect();
    }, 5000);
  });

  socket.on('disconnect', () => {
    console.log('✅ Socket.IO disconnected');
  });

  socket.on('connect_error', (error) => {
    console.log('❌ Socket.IO connection error:', error.message);
  });
}

function testTrackingEvents(socket) {
  console.log('📍 Testing tracking events...');
  
  // Join tracking room
  socket.emit('tracking:join', 'booking_1707584400000');
  
  socket.on('tracking:joined', (data) => {
    console.log('✅ Joined tracking room:', data.bookingId);
  });
  
  socket.on('tracking:updated', (data) => {
    console.log('📍 Tracking update received:', data);
  });
  
  // Simulate tracking update
  setTimeout(() => {
    socket.emit('tracking:update', {
      bookingId: 'booking_1707584400000',
      location: { lat: 40.7455, lng: -73.9900 },
      status: 'in_transit'
    });
  }, 1000);
}

function testChatEvents(socket) {
  console.log('💬 Testing chat events...');
  
  // Join chat room
  socket.emit('chat:join', 'conv_1707584400000');
  
  socket.on('chat:joined', (data) => {
    console.log('✅ Joined chat room:', data.conversationId);
  });
  
  socket.on('chat:message', (data) => {
    console.log('💬 Chat message received:', data);
  });
  
  socket.on('chat:typing', (data) => {
    console.log('⌨️ Typing indicator received:', data);
  });
  
  // Simulate chat message
  setTimeout(() => {
    socket.emit('chat:message', {
      conversationId: 'conv_1707584400000',
      message: 'Hello, I need help with my move!',
      senderType: 'customer'
    });
  }, 2000);
  
  // Simulate typing indicator
  setTimeout(() => {
    socket.emit('chat:typing', {
      conversationId: 'conv_1707584400000',
      isTyping: true
    });
  }, 3000);
}

// Main test execution
async function runTests() {
  console.log('🚀 Starting Uber-like features test suite...\n');
  
  // API Tests
  console.log('📡 Testing API endpoints...\n');
  
  const quoteId = await testQuoteCreation();
  await testCustomerQuotes();
  const bookingId = await testBookingCreation();
  await testBookingDetails(bookingId);
  await testAvailableMovers();
  
  const conversationId = await testChatConversation();
  await testChatMessage(conversationId);
  await testChatMessages(conversationId);
  await testAvailableAgents();
  
  console.log('\n🔌 Testing Socket.IO real-time features...\n');
  testSocketConnection();
  
  // Wait for socket tests to complete
  setTimeout(() => {
    console.log('\n✅ All tests completed!');
    process.exit(0);
  }, 10000);
}

// Run tests
runTests().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
}); 