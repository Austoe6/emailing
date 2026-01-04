# Resend Broadcast API

A Vercel serverless function API that broadcasts emails to all contacts in your Resend account using the Resend API.

## Features

- 📧 Broadcast emails to all contacts in your Resend account
- 🔄 Automatically fetches contacts from all audiences
- ✅ Handles duplicates and errors gracefully
- 🚀 Deploy to Vercel with zero configuration
- 🔒 Secure API key management via environment variables

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file (or set them in Vercel dashboard):

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=Your Company Name (optional)
```

**Get your Resend API Key:**
1. Go to [Resend API Keys](https://resend.com/api-keys)
2. Create a new API key
3. Copy the key and add it to your environment variables

**Important:** The `FROM_EMAIL` must be from a domain you've verified in your Resend account.

### 3. Deploy to Vercel

```bash
# Install Vercel CLI if you haven't
npm i -g vercel

# Deploy
vercel

# Or deploy to production
vercel --prod
```

Alternatively, you can:
1. Push this code to GitHub
2. Import the project in [Vercel Dashboard](https://vercel.com/dashboard)
3. Add environment variables in the Vercel project settings
4. Deploy

## API Usage

### Endpoint

```
POST /api/broadcast
```

### Request Body

```json
{
  "subject": "Your Email Subject",
  "body": "<h1>Your HTML Email Body</h1><p>This can be HTML content.</p>",
  "fromEmail": "noreply@yourdomain.com",  // Optional if FROM_EMAIL env var is set
  "fromName": "Your Company Name"         // Optional
}
```

### Example Request

```bash
curl -X POST https://your-app.vercel.app/api/broadcast \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Important Announcement",
    "body": "<h1>Hello!</h1><p>This is a broadcast email to all contacts.</p>",
    "fromEmail": "noreply@yourdomain.com",
    "fromName": "My Company"
  }'
```

### Response

```json
{
  "success": true,
  "message": "Broadcast completed: 150 sent, 0 failed",
  "sent": 150,
  "failed": 0,
  "total": 150,
  "results": [
    {
      "email": "contact1@example.com",
      "status": "success",
      "id": "email_id_123"
    },
    {
      "email": "contact2@example.com",
      "status": "success",
      "id": "email_id_124"
    }
  ]
}
```

### Error Responses

**400 Bad Request** - Missing required fields:
```json
{
  "error": "Missing required fields: subject and body are required"
}
```

**500 Internal Server Error**:
```json
{
  "error": "Internal server error",
  "message": "Error details here"
}
```

## How It Works

1. The API fetches all audiences from your Resend account
2. For each audience, it retrieves all contacts
3. Removes duplicate contacts (based on email address)
4. Sends the email to each unique contact
5. Returns a summary with success/failure counts

## Notes

- The API processes contacts sequentially to avoid rate limits
- Contacts are deduplicated across all audiences
- If an email fails to send to a specific contact, it continues with the rest
- The function has a 60-second timeout (configurable in `vercel.json`)

## Local Development

```bash
# Install Vercel CLI
npm i -g vercel

# Run locally
vercel dev
```

The API will be available at `http://localhost:3000/api/broadcast`

## Security

- Never commit your `.env` file
- Keep your `RESEND_API_KEY` secure
- Use environment variables in Vercel dashboard for production
- Consider adding authentication if you need to restrict access

## License

MIT

