const express = require('express');
const cors = require('cors');

const app = express();
const port = 3000;

// CORS configuration
app.use(cors({
  origin: ['http://localhost:5000', 'http://localhost:5173'],
  credentials: true
}));

app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    port: port,
    message: 'Test server is running'
  });
});

// Prelaunch endpoints
app.post('/api/prelaunch/register', (req, res) => {
  const { name, email } = req.body;
  console.log('Registration received:', { name, email });
  
  res.status(201).json({
    success: true,
    message: 'Thank you for signing up! You\'ll receive your 30% off code and lifetime deal details soon.',
    data: {
      id: Date.now().toString(),
      email: email
    }
  });
});

app.get('/api/prelaunch/subscribers', (req, res) => {
  res.json({
    success: true,
    data: {
      currentCount: 1247,
      averageSubmissions: 15,
      lastUpdated: new Date().toISOString(),
      totalSubscribers: 1247
    }
  });
});

app.get('/api/prelaunch/early_subscribers', (req, res) => {
  res.redirect('/api/prelaunch/subscribers');
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Test server running on http://localhost:${port}`);
  console.log(`📧 API endpoints available:`);
  console.log(`   - GET  /api/health`);
  console.log(`   - POST /api/prelaunch/register`);
  console.log(`   - GET  /api/prelaunch/subscribers`);
  console.log(`   - GET  /api/prelaunch/early_subscribers`);
}); 