// Simple Express server for local testing
const express = require('express');
const dotenv = require('dotenv');

// Load environment variables FIRST, before requiring other modules
dotenv.config();

// Now require the broadcast handler (after env vars are loaded)
const broadcastHandler = require('./api/broadcast');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'resend-broadcast-api' });
});

// Debug endpoint to check contacts and audiences
app.get('/api/debug/contacts', async (req, res) => {
  try {
    const { Resend } = require('resend');
    const client = new Resend(process.env.RESEND_API_KEY);
    
    const debugInfo = {
      apiKeySet: !!process.env.RESEND_API_KEY,
      apiKeyPrefix: process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.substring(0, 10) + '...' : 'not set',
    };

    // Try to get audiences
    try {
      const audiencesResponse = await client.audiences.list();
      debugInfo.audiences = {
        success: true,
        count: audiencesResponse.data?.data?.length || 0,
        data: audiencesResponse.data?.data || [],
        fullResponse: audiencesResponse.data,
      };
    } catch (err) {
      debugInfo.audiences = {
        success: false,
        error: err.message,
      };
    }

    // Try to get contacts from each audience
    if (debugInfo.audiences.success && debugInfo.audiences.count > 0) {
      debugInfo.contactsByAudience = [];
      for (const audience of debugInfo.audiences.data) {
        try {
          const contactsResponse = await client.contacts.list({
            audienceId: audience.id,
          });
          debugInfo.contactsByAudience.push({
            audienceId: audience.id,
            audienceName: audience.name,
            success: true,
            count: contactsResponse.data?.data?.length || 0,
            data: contactsResponse.data?.data || [],
            fullResponse: contactsResponse.data,
          });
        } catch (err) {
          debugInfo.contactsByAudience.push({
            audienceId: audience.id,
            audienceName: audience.name,
            success: false,
            error: err.message,
          });
        }
      }
    }

    res.json(debugInfo);
  } catch (error) {
    res.status(500).json({
      error: 'Debug endpoint error',
      message: error.message,
    });
  }
});

// Use the broadcast handler
app.post('/api/broadcast', broadcastHandler);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Resend Broadcast API',
    endpoints: {
      health: 'GET /health',
      broadcast: 'POST /api/broadcast'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Resend Broadcast API running on http://localhost:${PORT}`);
  console.log(`📧 Test endpoint: POST http://localhost:${PORT}/api/broadcast\n`);
  
  // Check environment variables
  if (!process.env.RESEND_API_KEY) {
    console.warn('⚠️  WARNING: RESEND_API_KEY not found in environment variables');
  } else {
    console.log('✅ RESEND_API_KEY is set');
  }
  
  if (!process.env.FROM_EMAIL) {
    console.warn('⚠️  WARNING: FROM_EMAIL not set (must be provided in request body)');
  } else {
    console.log(`✅ FROM_EMAIL is set: ${process.env.FROM_EMAIL}`);
  }
  console.log('');
});

