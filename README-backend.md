# Portfolio Backend Setup

This backend handles email submissions from your portfolio contact forms.

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment Variables**
   - Copy `.env.example` to `.env`
   - Fill in your email configuration:
     - `SMTP_HOST`: Your email provider's SMTP host (e.g., smtp.gmail.com)
     - `SMTP_PORT`: SMTP port (587 for TLS, 465 for SSL)
     - `SMTP_SECURE`: true for SSL, false for TLS
     - `EMAIL_USER`: Your email address
     - `EMAIL_PASS`: Your email password or app password
     - `RECIPIENT_EMAIL`: Email address where you want to receive messages

3. **For Gmail Users (Your Setup - keithmurimi9@gmail.com)**
   Since you already have 2FA enabled, you just need to generate an App Password:
   
   a. **Generate an App Password**:
      - Go to https://myaccount.google.com/apppasswords
      - Sign in with keithmurimi9@gmail.com
      - Select "Mail" as the app
      - Select "Other (custom name)" as the device
      - Enter "Portfolio Contact Form" as the name
      - Click "Generate"
      - **Copy the 16-character password** (remove any spaces)
   
   b. **Create and configure .env file**:
      ```bash
      cp .env.example .env
      ```
      Then edit .env and replace `your-16-character-app-password-here` with your actual App Password.
   
   **Important Notes:**
   - Use the App Password, NOT your regular Gmail password
   - The App Password is 16 characters long
   - If authentication fails, regenerate the App Password

4. **Alternative Email Providers**
   If Gmail doesn't work, try these alternatives:
   
   **Outlook/Hotmail:**
   ```
   SMTP_HOST=smtp-mail.outlook.com
   SMTP_PORT=587
   SMTP_SECURE=false
   ```
   
   **Yahoo:**
   ```
   SMTP_HOST=smtp.mail.yahoo.com
   SMTP_PORT=587
   SMTP_SECURE=false
   ```
   
   **Custom SMTP Services (Recommended for Production):**
   - SendGrid, Mailgun, or AWS SES for better deliverability

5. **Start the Server**
   ```bash
   npm start
   ```
   Or for development with auto-restart:
   ```bash
   npm run dev
   ```

6. **Update Frontend API URL**
   In `script.js`, change the `API_BASE_URL` variable to your deployed backend URL:
   ```javascript
   const API_BASE_URL = 'https://your-backend-domain.com'; // Replace with your actual domain
   ```

7. **Test the Endpoint**
   Visit `http://localhost:3001/health` to verify the server is running.

8. **Testing Email Functionality**
   - Submit a contact form while the server is running
   - Check the server console for any errors
   - If using Gmail and it fails, try the alternative providers listed above
   - For quick testing without real emails, you can temporarily use Ethereal Email:
     - Visit https://ethereal.email/ to get test SMTP credentials
     - Update your .env with their provided settings

## Deployment

For production deployment, you'll need to:
- Set environment variables in your hosting platform
- Ensure the backend and frontend are on the same domain or configure CORS properly
- Use HTTPS in production
- Consider using a service like Railway, Render, or Vercel for easy deployment

## Security Notes

- Never commit the `.env` file to version control
- Use strong passwords and app passwords when possible
- Consider rate limiting for production use
- Validate and sanitize all input data