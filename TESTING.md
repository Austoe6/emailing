# Local Testing Guide

## Start the Server

```bash
npm start
```

The server will start on `http://localhost:3000`

## Test the API

### Option 1: Using curl (PowerShell)

```powershell
$body = @{
    subject = "Test Broadcast Email"
    body = "<h1>Hello!</h1><p>This is a test email.</p>"
    fromEmail = "noreply@yourdomain.com"
    fromName = "Test Sender"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/broadcast" -Method POST -Body $body -ContentType "application/json"
```

### Option 2: Using the test script

```bash
node test-request.js
```

### Option 3: Using Postman or any HTTP client

**URL:** `POST http://localhost:3000/api/broadcast`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "subject": "Test Broadcast Email",
  "body": "<h1>Hello from Resend Broadcast API!</h1><p>This is a test email sent to all contacts.</p>",
  "fromEmail": "noreply@yourdomain.com",
  "fromName": "Test Sender"
}
```

### Option 4: Using fetch in browser console

```javascript
fetch('http://localhost:3000/api/broadcast', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    subject: 'Test Broadcast Email',
    body: '<h1>Hello!</h1><p>This is a test email.</p>',
    fromEmail: 'noreply@yourdomain.com',
    fromName: 'Test Sender'
  })
})
.then(res => res.json())
.then(data => console.log(data))
.catch(err => console.error('Error:', err));
```

## Check Server Status

```bash
# Health check
curl http://localhost:3000/health

# Or in PowerShell:
Invoke-RestMethod -Uri "http://localhost:3000/health"
```

## Expected Response

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
    }
  ]
}
```

## Troubleshooting

1. **Server not starting?** Make sure port 3000 is not in use
2. **RESEND_API_KEY error?** Check your `.env` file has the correct API key
3. **FROM_EMAIL error?** Either set it in `.env` or include it in the request body
4. **No contacts found?** Make sure you have contacts in your Resend account audiences

