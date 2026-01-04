const { Resend } = require('resend');

// Initialize Resend client (lazy initialization to ensure env vars are loaded)
let resend = null;
function getResendClient() {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is not set');
    }
    resend = new Resend(apiKey);
  }
  return resend;
}

/**
 * Fetches all contacts from Resend
 * Tries multiple approaches: direct contacts list, then audiences
 */
async function getAllContacts() {
  try {
    const client = getResendClient();
    const allContacts = [];

    // First, try to get all audiences
    let audiences = [];
    try {
      const audiencesResponse = await client.audiences.list();
      audiences = audiencesResponse.data?.data || [];
      console.log(`Found ${audiences.length} audience(s)`);
      // Delay after API call to respect rate limit
      await new Promise(resolve => setTimeout(resolve, 600));
    } catch (err) {
      console.error('Error fetching audiences:', err.message);
    }

    // If we have audiences, get contacts from each
    if (audiences.length > 0) {
      for (const audience of audiences) {
        try {
          // Get contacts from each audience
          const contactsResponse = await client.contacts.list({
            audienceId: audience.id,
          });
          // Delay after each API call to respect rate limit
          await new Promise(resolve => setTimeout(resolve, 600));
          
          console.log(`Audience ${audience.id} (${audience.name}):`, contactsResponse.data);
          
          if (contactsResponse.data?.data && Array.isArray(contactsResponse.data.data)) {
            allContacts.push(...contactsResponse.data.data);
            console.log(`  Found ${contactsResponse.data.data.length} contact(s) in this audience`);
          } else if (contactsResponse.data) {
            // Handle different response structures
            const contacts = Array.isArray(contactsResponse.data) 
              ? contactsResponse.data 
              : contactsResponse.data.contacts || [];
            if (contacts.length > 0) {
              allContacts.push(...contacts);
              console.log(`  Found ${contacts.length} contact(s) in this audience (alternative format)`);
            }
          }
        } catch (err) {
          console.error(`Error fetching contacts from audience ${audience.id} (${audience.name}):`, err.message);
          // Continue with other audiences even if one fails
        }
      }
    } else {
      // No audiences found, try to list contacts directly (if API supports it)
      console.log('No audiences found, trying direct contacts list...');
      try {
        // Some Resend accounts might have contacts without audiences
        // Try listing contacts without audienceId (if supported)
        const contactsResponse = await client.contacts.list();
        console.log('Direct contacts response:', contactsResponse.data);
        // Delay after API call to respect rate limit
        await new Promise(resolve => setTimeout(resolve, 600));
        
        if (contactsResponse.data?.data && Array.isArray(contactsResponse.data.data)) {
          allContacts.push(...contactsResponse.data.data);
        } else if (Array.isArray(contactsResponse.data)) {
          allContacts.push(...contactsResponse.data);
        }
      } catch (err) {
        console.error('Direct contacts list not supported or failed:', err.message);
      }
    }

    // Remove duplicates based on email
    const uniqueContacts = Array.from(
      new Map(allContacts.map(contact => [contact.email, contact])).values()
    );

    console.log(`Total unique contacts found: ${uniqueContacts.length}`);
    return uniqueContacts;
  } catch (error) {
    console.error('Error fetching contacts:', error);
    throw error;
  }
}

/**
 * Broadcasts email to all contacts using batch sending for better performance
 */
async function broadcastEmail(subject, body, fromEmail, fromName = null) {
  try {
    // Get all contacts
    const contacts = await getAllContacts();
    
    if (contacts.length === 0) {
      return {
        success: false,
        message: 'No contacts found in Resend account',
        sent: 0,
        total: 0,
      };
    }

    // Prepare the from field
    const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail;

    // Prepare batch email payloads
    const batchEmails = contacts.map(contact => ({
      from: from,
      to: contact.email,
      subject: subject,
      html: body,
    }));

    let successCount = 0;
    let failureCount = 0;
    const results = [];

    const client = getResendClient();
    
    // For small batches or to avoid duplicate sends, use individual sends
    // Batch API response format can be inconsistent, causing duplicates
    // Send emails individually to ensure accurate tracking
    console.log(`Sending ${batchEmails.length} emails individually...`);
    
    // Add delay before sending first email to ensure rate limit is reset after contact fetching
    await new Promise(resolve => setTimeout(resolve, 600));
    
    for (let i = 0; i < batchEmails.length; i++) {
      const email = batchEmails[i];
      try {
        const emailResponse = await client.emails.send(email);
        
        // Log full response for debugging
        console.log(`Response for ${email.to}:`, JSON.stringify(emailResponse, null, 2));
        
        // Check multiple possible response structures
        let emailId = null;
        let responseError = null;
        
        // Try different response formats
        if (emailResponse.data?.id) {
          emailId = emailResponse.data.id;
        } else if (emailResponse.id) {
          emailId = emailResponse.id;
        } else if (emailResponse.data && typeof emailResponse.data === 'string') {
          // Sometimes the ID is returned as a string directly
          emailId = emailResponse.data;
        } else if (emailResponse.error) {
          responseError = emailResponse.error;
        }
        
        // Check for errors in response
        if (emailResponse.error || responseError) {
          failureCount++;
          results.push({
            email: email.to,
            status: 'failed',
            error: emailResponse.error?.message || responseError || 'Unknown error from API',
          });
          console.error(`✗ Failed to send to ${email.to}:`, emailResponse.error || responseError);
        } else if (emailId) {
          successCount++;
          results.push({
            email: email.to,
            status: 'success',
            id: emailId,
          });
          console.log(`✓ Sent to ${email.to} (ID: ${emailId})`);
        } else {
          // If no error but also no ID, check if response indicates success
          // Some API versions might return success without ID
          if (emailResponse.data && !emailResponse.error) {
            // Assume success if we got data back without errors
            successCount++;
            results.push({
              email: email.to,
              status: 'success',
              id: 'sent',
              note: 'Email sent but ID not in expected format',
            });
            console.log(`✓ Sent to ${email.to} (response received, ID format unexpected)`);
          } else {
            failureCount++;
            results.push({
              email: email.to,
              status: 'failed',
              error: 'No email ID returned in response',
              response: emailResponse,
            });
            console.warn(`✗ Failed to send to ${email.to}: No email ID returned`, emailResponse);
          }
        }
        
        // Delay to respect Resend rate limit (2 requests per second = 500ms minimum between requests)
        // Using 600ms to be safe and account for processing time
        if (i < batchEmails.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 600));
        }
      } catch (err) {
        failureCount++;
        results.push({
          email: email.to,
          status: 'failed',
          error: err.message || 'Unknown error',
          details: err.response?.data || err.stack,
        });
        console.error(`✗ Error sending to ${email.to}:`, err.message, err.response?.data);
      }
    }

    return {
      success: true,
      message: `Broadcast completed: ${successCount} sent, ${failureCount} failed`,
      sent: successCount,
      failed: failureCount,
      total: contacts.length,
      results: results,
    };
  } catch (error) {
    console.error('Error broadcasting email:', error);
    throw error;
  }
}

/**
 * Vercel serverless function handler
 */
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed. Use POST.',
    });
  }

  // Check for API key
  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({
      error: 'RESEND_API_KEY environment variable is not set',
    });
  }

  try {
    const { subject, body, fromEmail, fromName } = req.body;

    // Validate required fields
    if (!subject || !body) {
      return res.status(400).json({
        error: 'Missing required fields: subject and body are required',
      });
    }

    // Use fromEmail from request or environment variable
    const senderEmail = fromEmail || process.env.FROM_EMAIL;
    if (!senderEmail) {
      return res.status(400).json({
        error: 'fromEmail is required (either in request body or FROM_EMAIL environment variable)',
      });
    }

    // Broadcast the email
    const result = await broadcastEmail(subject, body, senderEmail, fromName);

    return res.status(200).json(result);
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
};

