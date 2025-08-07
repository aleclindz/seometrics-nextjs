# Deployment Guide

This guide provides comprehensive instructions for deploying the project on Vercel and a Generic Node.js environment. Follow the steps outlined below to ensure a successful deployment.

## 1. Prerequisites

Before deploying the application, ensure you have the following tools and accounts set up:

### Required Tools
- **Node.js**: Ensure you have Node.js (version 14.x or later) installed. You can download it from [Node.js official website](https://nodejs.org/).
- **npm**: npm is included with Node.js. Verify installation with:
  ```bash
  npm -v
  ```
- **Git**: Version control system for managing code. Install from [Git official website](https://git-scm.com/).
- **Concurrently**: This package is used to run multiple commands concurrently. Install it globally if not already installed:
  ```bash
  npm install -g concurrently
  ```

### Required Accounts
- **Supabase**: Create an account at [Supabase](https://supabase.com/) and set up your database.
- **Vercel**: Create an account at [Vercel](https://vercel.com/) for deploying the application.

## 2. Environment Setup

### Environment Variables
Create a `.env` file in the root of your project directory and add the following environment variables. Replace the placeholders with your actual values:

```plaintext
DATABASE_URL=<your_supabase_database_url>
SUPABASE_ANON_KEY=<your_supabase_anon_key>
SUPABASE_SERVICE_ROLE_KEY=<your_supabase_service_role_key>
GOOGLE_API_KEY=<your_google_api_key>
STRIPE_SECRET_KEY=<your_stripe_secret_key>
```

Ensure that you do not commit this file to version control by adding it to your `.gitignore`.

### Configuration
- Install the necessary dependencies by running:
  ```bash
  npm install
  ```

## 3. Build Process

To build the application, run the following commands:

### Build Commands
1. **Build Next.js Application**:
   ```bash
   npm run build
   ```
2. **Build Strapi CMS**:
   ```bash
   cd strapi-cms && npm run build
   ```

### Run Migrations
If your application requires database migrations, run:
```bash
npm run run-migration
```

## 4. Deployment Steps

### A. Deploying on Vercel

1. **Login to Vercel**:
   ```bash
   vercel login
   ```

2. **Initialize Vercel**:
   Run the following command in your project root:
   ```bash
   vercel
   ```

3. **Configure Environment Variables in Vercel**:
   Go to your Vercel dashboard, select your project, and navigate to the **Settings** > **Environment Variables** section. Add the same environment variables defined in your `.env` file.

4. **Deploy**:
   After configuration, you can deploy your application with:
   ```bash
   vercel --prod
   ```

### B. Deploying on Generic Node.js

1. **Clone the Repository**:
   If you haven't already, clone the repository:
   ```bash
   git clone <repository_url>
   cd <repository_name>
   ```

2. **Install Dependencies**:
   Ensure all dependencies are installed:
   ```bash
   npm install
   ```

3. **Start the Application**:
   Run the following command to start the application:
   ```bash
   npm run start
   ```

4. **Start Strapi CMS**:
   In a separate terminal, navigate to the Strapi CMS directory and run:
   ```bash
   cd strapi-cms && npm run start
   ```

## 5. Post-Deployment

### Verification
- Access the application via the URL provided by Vercel or your server's IP address for Node.js.
- Verify that the application is running correctly by checking the logs and ensuring there are no errors.

### Monitoring
- Use tools like [LogRocket](https://logrocket.com/) or [Sentry](https://sentry.io/) for monitoring application performance and error tracking.

## 6. Troubleshooting

### Common Deployment Issues

1. **Environment Variables Not Set**:
   Ensure that all environment variables are correctly set in your `.env` file or in the Vercel dashboard.

2. **Build Failures**:
   - Check for any syntax errors in your code.
   - Ensure all dependencies are correctly installed.

3. **Database Connection Issues**:
   - Verify that your Supabase database is running and accessible.
   - Check your `DATABASE_URL` and keys for correctness.

4. **Application Not Starting**:
   - Ensure that the correct Node.js version is being used.
   - Check the logs for any error messages that can provide insight into the issue.

5. **CORS Issues**:
   If you encounter CORS errors, ensure that your Supabase settings allow requests from your application's domain.

By following this guide, you should be able to successfully deploy and run your application on both Vercel and a Generic Node.js environment. For further assistance, consult the documentation for the specific tools and services you are using.