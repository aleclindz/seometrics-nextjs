# Troubleshooting Guide

## Common Issues & Solutions

This guide covers the most frequently encountered issues and their solutions for SEOAgent.com users and developers.

## 🔐 Authentication Issues

### Cannot Sign In / "Unauthorized" Errors

**Symptoms:**
- Unable to log in with correct credentials
- "Unauthorized" error on API requests
- Redirected to login page repeatedly

**Common Causes & Solutions:**

#### 1. Session Timeout
**Problem**: Session expired after 30 minutes of inactivity
**Solution**: 
- Simply log in again
- Your data is preserved, just need to re-authenticate

#### 2. Browser Storage Issues
**Problem**: Authentication tokens corrupted in browser storage
**Solution**:
```bash
# Clear browser storage for SEOAgent.com
1. Open Developer Tools (F12)
2. Go to Application tab
3. Clear Local Storage and Session Storage for seoagent.com
4. Refresh page and log in again
```

#### 3. Multiple Tab Issues
**Problem**: Authentication conflicts between multiple tabs
**Solution**:
- Close all SEOAgent tabs
- Open single new tab and log in
- Use only one tab at a time for best experience

**Related API**: [`/api/auth/get-token`](api-reference.md#authentication)

---

## 🌐 Google Search Console Issues

### GSC Connection Failed

**Symptoms:**
- "Failed to connect to Google Search Console"
- OAuth redirect errors
- Empty website list after connection

**Troubleshooting Steps:**

#### 1. Verify GSC Access
- Ensure you have "Owner" or "Full User" access in Google Search Console
- Verify your websites are properly verified in GSC
- Check that GSC account has data for your websites

#### 2. Browser Issues
```bash
# Clear Google OAuth cookies
1. Go to chrome://settings/cookies
2. Search for "google.com"
3. Delete all Google-related cookies
4. Try connecting again
```

#### 3. Permission Issues
- Make sure you're using the same Google account that owns the GSC properties
- Check GSC permissions: https://search.google.com/search-console/users
- Verify website ownership hasn't expired

#### 4. Re-authorization
1. Go to Dashboard → Disconnect GSC
2. Clear browser cache and cookies
3. Reconnect with fresh OAuth flow

**Related APIs**: 
- [`/api/gsc/oauth/start`](api-reference.md#gsc-oauth-start)
- [`/api/gsc/properties`](api-reference.md#gsc-properties)

### No Websites Showing After GSC Connection

**Problem**: GSC connected but no websites appear in Website Management

**Solutions:**
1. **Sync Properties**: Click "Sync GSC Properties" in Website Management
2. **Check Verification**: Ensure websites are verified (not just domain properties)
3. **Permission Level**: Must have "Owner" access, not just "Restricted User"
4. **Wait for Processing**: Initial sync can take 1-2 minutes

---

## 📝 Content Generation Issues

### Article Generation Fails

**Symptoms:**
- "Article generation failed" error
- Blank or incomplete articles
- Generation hangs indefinitely

**Common Causes & Solutions:**

#### 1. Plan Limits Exceeded
**Problem**: Free plan users trying to generate articles
**Solution**: 
- Upgrade to Starter plan ($29/month) for unlimited article generation
- Check current plan in Account settings

#### 2. No Managed Website Selected
**Problem**: Trying to generate content without selecting a managed website
**Solution**:
1. Go to Website Management
2. Select at least one website to manage
3. Return to Content Writer and try again

#### 3. OpenAI API Issues
**Problem**: External AI service temporarily unavailable
**Solution**:
- Wait 5-10 minutes and try again
- Try shorter, more specific titles
- Contact support if issue persists

#### 4. Keywords Too Competitive
**Problem**: Target keywords are too broad or competitive
**Solution**:
- Use more specific, long-tail keywords
- Target 2-4 keywords maximum per article
- Focus on niche topics rather than broad terms

**Related API**: [`/api/articles/generate`](api-reference.md#generate-article)

### CMS Publishing Fails

**Symptoms:**
- Article generates but fails to publish
- "Publishing failed" errors
- Articles stuck in "generated" status

**Troubleshooting Steps:**

#### 1. Test CMS Connection
1. Go to CMS Connections
2. Find your connection
3. Click "Test Connection"
4. Fix any authentication issues

#### 2. Check CMS Permissions
- **WordPress**: Ensure user has "Editor" or "Administrator" role
- **Strapi**: Verify API token has content creation permissions
- **Webflow**: Check CMS collection permissions
- **Shopify**: Confirm app has blog post creation scope

#### 3. CMS Configuration Issues
```bash
# Common CMS fixes:

# WordPress: Enable REST API
add_action('rest_api_init', function() {
    // Ensure REST API is enabled
});

# Strapi: Check content-type permissions
# Go to Settings → Roles → Authenticated → Content-Type permissions

# Webflow: Verify collection structure
# Ensure collection has Title and Content fields
```

**Related APIs**: 
- [`/api/cms/test-connection`](api-reference.md#cms-test-connection)
- [`/api/articles/publish`](api-reference.md#publish-article)

---

## 🏢 Website Management Issues

### Cannot Manage Websites

**Symptoms:**
- "Plan limit exceeded" errors
- Cannot select additional websites
- Upgrade prompts when trying to manage sites

**Solutions:**

#### 1. Plan Limits
- **Free Plan**: 0 managed websites (view-only)
- **Starter Plan**: 1 managed website
- **Pro Plan**: 5 managed websites

**Solution**: Upgrade your plan in Account settings

#### 2. Website Switching (Single-Site Plans)
**Problem**: Cannot change managed website on Starter plan
**Solution**:
1. Go to Website Management
2. Select new website (radio button)
3. Previous website automatically unmanaged
4. New website becomes managed

#### 3. GSC Sync Issues
**Problem**: Websites not appearing after GSC connection
**Solution**:
1. Click "Sync GSC Properties" button
2. Wait for sync to complete
3. Refresh page if needed

**Related API**: [`/api/websites`](api-reference.md#website-management)

### Website Deletion Issues

**Symptoms:**
- Delete button doesn't work
- Website reappears after deletion
- Cannot remove currently managed website

**Solutions:**

#### 1. Managed Website Deletion
**Problem**: Cannot delete currently managed website
**Solution**:
1. First select a different website to manage (or none)
2. Then delete the previously managed website
3. Deleted websites are excluded from future GSC syncs

#### 2. GSC Re-import Prevention
**Problem**: Deleted websites keep coming back
**Solution**:
- Deleted websites are marked as "excluded from sync"
- They won't be re-imported from GSC automatically
- If you want them back, remove and re-add GSC connection

---

## 💳 Subscription & Billing Issues

### Payment Failures

**Symptoms:**
- "Payment failed" notifications
- Account downgraded unexpectedly
- Cannot access paid features

**Solutions:**

#### 1. Update Payment Method
1. Go to Account → Manage Subscription
2. Click "Update Payment Method"
3. Enter new card details
4. Retry failed payment

#### 2. Billing Address Issues
- Ensure billing address matches card
- Check for international payment restrictions
- Contact your bank if card is being declined

#### 3. Subscription Status
```bash
# Check subscription status:
1. Account → Current Plan
2. Look for status: Active, Past Due, Cancelled
3. If Past Due: Update payment method
4. If Cancelled: Reactivate subscription
```

### Plan Upgrade Issues

**Symptoms:**
- Cannot upgrade to higher plan
- Upgrade button not working
- Features not unlocked after upgrade

**Solutions:**

#### 1. Browser Issues
- Clear browser cache and cookies
- Try in incognito/private mode
- Use different browser if needed

#### 2. Stripe Checkout Issues
- Disable ad blockers temporarily
- Allow popups for seoagent.com
- Check for JavaScript errors in console

#### 3. Plan Activation Delay
- Plan changes may take 1-2 minutes to activate
- Log out and log back in to refresh plan status
- Contact support if features don't unlock after 5 minutes

**Related API**: [`/api/subscription/create-checkout-session`](api-reference.md#create-checkout-session)

---

## 🔧 Technical Issues

### Page Loading Problems

**Symptoms:**
- Blank pages
- Infinite loading spinners
- "Something went wrong" errors

**Solutions:**

#### 1. Browser Compatibility
**Supported Browsers:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

#### 2. JavaScript Errors
```bash
# Check browser console:
1. Press F12 to open Developer Tools
2. Go to Console tab
3. Look for red error messages
4. Copy error and contact support if needed
```

#### 3. Network Issues
- Check internet connection
- Try accessing from different network
- Disable VPN if using one
- Check if workplace firewall is blocking requests

### Mobile App Issues

**Symptoms:**
- Features not working on mobile
- Layout problems on small screens
- Touch/gesture issues

**Solutions:**

#### 1. Mobile Browser Compatibility
- Use Chrome or Safari on mobile
- Enable JavaScript in mobile browser
- Clear mobile browser cache

#### 2. Screen Size Issues
- Rotate device to landscape for better experience
- Use zoom controls if text is too small
- Some features work better on desktop/tablet

---

## 🚀 Performance Issues

### Slow Loading Times

**Symptoms:**
- Pages take long time to load
- API requests timeout
- General sluggish performance

**Solutions:**

#### 1. Network Optimization
```bash
# Speed up loading:
1. Close unnecessary browser tabs
2. Disable browser extensions temporarily
3. Use wired internet instead of WiFi if possible
4. Try accessing during off-peak hours
```

#### 2. Browser Optimization
- Clear browser cache: Ctrl+Shift+Delete
- Disable heavy browser extensions
- Update browser to latest version
- Restart browser completely

#### 3. Data Usage Optimization
- Use WiFi instead of mobile data when possible
- Close other applications using internet
- Check for background downloads/updates

### API Timeout Errors

**Symptoms:**
- "Request timed out" errors
- Long delays before error messages
- Partial data loading

**Solutions:**

#### 1. Retry Strategy
- Wait 30 seconds and try again
- Break large requests into smaller ones
- Try during less busy times

#### 2. Network Configuration
- Check firewall settings
- Ensure ports 80 and 443 are open
- Try from different network location

---

## 🔍 SEO Debug Tool Issues

### Audit Failures

**Symptoms:**
- "SEO audit failed" errors
- Incomplete audit results
- Cannot access audit URLs

**Solutions:**

#### 1. URL Accessibility
- Ensure website is publicly accessible
- Check for password protection or maintenance mode
- Verify URL format (include https://)

#### 2. Website Configuration
```bash
# Common website issues:
- robots.txt blocking crawlers
- Cloudflare protection too aggressive  
- Server returning 5xx errors
- SSL certificate problems
```

#### 3. Audit Limitations
- Very large websites may timeout
- Sites with heavy JavaScript may not audit completely
- Password-protected areas cannot be audited

---

## 📞 Getting Additional Help

### Before Contacting Support

1. **Check Status Page**: Verify if issue is system-wide
2. **Try Basic Solutions**: 
   - Refresh page
   - Clear browser cache
   - Try different browser
   - Log out and back in
3. **Gather Information**:
   - What were you trying to do?
   - What error message appeared?
   - When did the issue start?
   - What browser/device are you using?

### Contact Options

#### Technical Support
- **Email**: support@seoagent.com
- **Response Time**: 
  - Free Plan: 48 hours
  - Starter Plan: 24 hours  
  - Pro Plan: 12 hours
  - Enterprise: 4 hours

#### Billing Support
- **Email**: billing@seoagent.com
- **Stripe Portal**: Available in Account settings
- **Response Time**: 24 hours for all plans

#### Feature Requests
- **Email**: feedback@seoagent.com
- **GitHub Issues**: For technical feature requests
- **User Forum**: Community discussions and suggestions

### Information to Include in Support Requests

```
Subject: [Issue Type] Brief description

Account Email: your-email@example.com
Plan: [Free/Starter/Pro/Enterprise]
Browser: Chrome 120 on Windows 11
Issue Started: Approximate date/time

Steps to Reproduce:
1. Go to [page]
2. Click [button]
3. See error

Expected Behavior:
[What should happen]

Actual Behavior:
[What actually happens]

Error Messages:
[Exact error text]

Screenshots:
[Attach if helpful]
```

---

## 🔧 Developer Troubleshooting

### Local Development Issues

#### Environment Setup Problems
```bash
# Common fixes:
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# Check Node version
node --version  # Should be 18.17.0+
```

#### Database Connection Issues
```bash
# Test Supabase connection
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log('Anon Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
```

#### Build Failures
```bash
# Common ESLint fixes:
# Use &apos; instead of ' in JSX
"Don't" → "Don&apos;t"

# Use next/image instead of <img>
import Image from 'next/image'

# Run type check
npm run type-check
```

For more developer help, see [Development Guide](development.md).

---

This troubleshooting guide covers the most common issues. If your problem isn't listed here, please check our [User Guide](user-guide.md) for detailed feature documentation or contact support with the information template above.