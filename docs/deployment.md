# Deployment Guide

This guide provides comprehensive instructions for deploying the project on Vercel and a Generic Node.js environment. Follow the steps below to ensure a successful deployment.

## 1. Prerequisites

Before deploying the application, ensure you have the following tools and accounts:

### Tools
- **Node.js**: Version 14.x or higher. You can download it from [Node.js Official Website](https://nodejs.org/).
- **npm**: Comes bundled with Node.js.
- **Git**: For version control. Install from [Git Official Website](https://git-scm.com/).

### Accounts
- **Vercel Account**: Sign up at [Vercel](https://vercel.com/signup) if deploying on Vercel.
- **Supabase Account**: Create an account at [Supabase](https://supabase.io/) to manage your database.

## 2. Environment Setup

### Environment Variables
Create a `.env` file in the root of your project and configure the following environment variables:

```plaintext
SUPABASE_URL=<your_supabase_url>
SUPABASE_ANON_KEY=<your_supabase_anon_key>
STRIPE_SECRET_KEY=<your_stripe_secret_key>
GOOGLE_API_KEY=<your_google_api_key>
OPENAI_API_KEY=<your_openai_api_key>
```

> **Note**: Replace `<your_supabase_url>`, `<your_supabase_anon_key>`, etc., with your actual credentials.

### Configuration
Ensure that your Supabase database is set up correctly and that you have the necessary tables and schemas in place.

## 3. Build Process

To build the application, use the following commands:

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run Linting** (optional but recommended):
   ```bash
   npm run lint
   ```

3. **Build the Application**:
   ```bash
   npm run build
   ```

## 4. Deployment Steps

### A. Deploying on Vercel

1. **Login to Vercel**:
   ```bash
   npx vercel login
   ```

2. **Deploy the Application**:
   ```bash
   npx vercel
   ```

   Follow the prompts to select your project and configure the deployment settings. Vercel will automatically detect your framework and set up the necessary configurations.

3. **Set Environment Variables in Vercel**:
   After deployment, go to your Vercel dashboard, select your project, and navigate to the "Settings" tab. Under "Environment Variables", add the variables defined in your `.env` file.

### B. Deploying on Generic Node.js

1. **Clone the Repository**:
   ```bash
   git clone <repository-url>
   cd <repository-name>
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Run Database Migrations**:
   ```bash
   npm run run-migration
   ```

4. **Start the Application**:
   ```bash
   npm start
   ```

   Ensure that your server is running on the desired port (default is 3000).

## 5. Post-Deployment

### Verification
After deployment, verify that the application is running correctly:

- **Vercel**: Visit the URL provided by Vercel after deployment.
- **Node.js**: Open a browser and navigate to `http://localhost:3000` (or the port you specified).

### Monitoring
- Use tools like [LogRocket](https://logrocket.com/) or [Sentry](https://sentry.io/) for monitoring application performance and error tracking.
- Check the Supabase dashboard for database activity and logs.

## 6. Troubleshooting

### Common Deployment Issues

- **Environment Variables Not Set**: Ensure all required environment variables are correctly set in your deployment platform.
- **Database Connection Errors**: Verify your Supabase credentials and ensure the database is accessible.
- **Build Failures**: Check the build logs for errors. Common issues include missing dependencies or incorrect configurations.
- **Application Not Starting**: Ensure that the correct start script is being used and that no other processes are using the same port.

### Additional Commands
- **Run Database Audit**:
   ```bash
   npm run audit-db
   ```

- **Initialize SEO Agent**:
   ```bash
   npm run init-seoagent
   ```

- **Setup Stripe Products**:
   ```bash
   npm run setup-stripe
   ```

- **Test Webhook**:
   ```bash
   npm run test-webhook
   ```

- **Admin Tool Setup**:
   ```bash
   cd admin-tool
   npm install
   npm start
   ```

By following this guide, you should be able to successfully deploy and manage your application on both Vercel and a Generic Node.js environment. For further assistance, refer to the documentation of the respective platforms or reach out to the community forums.