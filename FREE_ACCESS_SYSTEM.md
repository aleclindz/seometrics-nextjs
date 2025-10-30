# Free Access System

A complete system for granting free Pro access to users without requiring Stripe payments.

## ✨ Features

- **Admin-Granted Free Access**: Admins can grant 1-24 months of free Pro access to any user
- **No Stripe Required**: Users get full Pro features without payment processing
- **Automatic Expiration**: Access automatically reverts to their original plan when period expires
- **Full Audit Trail**: Every grant/revoke is logged with timestamp, admin, and reason
- **Seamless Integration**: Works alongside existing Stripe subscriptions
- **Priority Override**: Free access takes precedence over all other subscription states

## 🎯 Use Cases

- Beta testers and early adopters
- Partnerships and collaborations
- Customer compensation
- Contest winners
- VIP/special access programs
- Content creators and influencers

## 📊 Database Schema

### New Columns in `user_plans`

```sql
free_until              TIMESTAMP WITH TIME ZONE  -- Expiration date
free_granted_by         VARCHAR(255)              -- Admin email
free_granted_at         TIMESTAMP WITH TIME ZONE  -- When granted
free_reason             TEXT                      -- Why granted
```

### New Table: `free_access_grants`

Audit log of all free access grants and revocations:

```sql
CREATE TABLE free_access_grants (
    id SERIAL PRIMARY KEY,
    user_token VARCHAR(255) REFERENCES login_users(token),
    granted_by VARCHAR(255) NOT NULL,
    months_granted INTEGER NOT NULL,
    previous_free_until TIMESTAMP WITH TIME ZONE,
    new_free_until TIMESTAMP WITH TIME ZONE NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Database Functions

#### `grant_free_months()`
Grants free access to a user, handles both new grants and extensions.

**Parameters:**
- `p_user_token` - User's token
- `p_months` - Number of months (1-24)
- `p_granted_by` - Admin email
- `p_reason` - Optional reason

**Logic:**
- If user already has free access, extends from expiration date
- If no free access, starts from now
- Creates/updates `user_plans` record
- Logs grant in `free_access_grants`
- Sets user to Pro tier (10 sites, 100 posts)

#### `revoke_free_access()`
Immediately revokes free access from a user.

**Parameters:**
- `p_user_token` - User's token
- `p_revoked_by` - Admin email
- `p_reason` - Optional reason

#### `has_active_free_access()`
Checks if a user currently has active free access.

### View: `active_free_access_users`
Shows all users with currently active free access, ordered by expiration date.

## 🔌 API Endpoints

### Grant Free Access
**POST** `/api/admin/users/grant-free-access`

```json
{
  "userToken": "user-token-uuid",
  "months": 3,
  "grantedBy": "admin@seoagent.com",
  "reason": "Beta tester program"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Granted 3 months of free Pro access to user@example.com",
  "user_email": "user@example.com",
  "details": {
    "success": true,
    "previous_free_until": null,
    "new_free_until": "2026-01-30T00:00:00Z",
    "months_granted": 3,
    "granted_by": "admin@seoagent.com"
  }
}
```

### Revoke Free Access
**DELETE** `/api/admin/users/grant-free-access?userToken=xxx&revokedBy=admin@seoagent.com&reason=xxx`

### Get Free Access History
**GET** `/api/admin/users/grant-free-access?userToken=xxx`

**Response:**
```json
{
  "success": true,
  "current_status": {
    "has_free_access": true,
    "free_until": "2026-01-30T00:00:00Z",
    "days_remaining": 92,
    "granted_by": "admin@seoagent.com",
    "granted_at": "2025-10-30T00:00:00Z",
    "reason": "Beta tester"
  },
  "history": [
    {
      "id": 1,
      "user_token": "user-token",
      "granted_by": "admin@seoagent.com",
      "months_granted": 3,
      "previous_free_until": null,
      "new_free_until": "2026-01-30T00:00:00Z",
      "reason": "Beta tester",
      "created_at": "2025-10-30T00:00:00Z"
    }
  ]
}
```

## 🖥️ Admin UI

### Location
Admin Dashboard → Users Tab → Actions column

### Grant Free Access Dialog

Clicking "Grant" button opens a dialog with:
- **Duration dropdown**: 1, 3, 6, 12, or 24 months
- **Reason field**: Optional text explaining why
- **Info box**: Explains what granting access does

### Free Access Display

In the Users table, shows:
- **Green badge**: "Pro 92d" with gift icon
- **Expiration date**: "Until Jan 30, 2026"
- **Revoke button**: Immediately removes free access

### Actions

- **Grant Button**: Opens grant dialog
- **Revoke Button**: Removes free access (requires confirmation)

## 🔄 Subscription Logic Integration

The free access system is integrated into `/api/subscription/manage` endpoint:

```typescript
// Check for free access first (takes precedence over everything)
const hasFreeAccess = userPlan.free_until && new Date(userPlan.free_until) > new Date();

if (hasFreeAccess) {
  // Override to Pro tier
  userPlan.tier = 'pro';
  userPlan.sites_allowed = 10;
  userPlan.posts_allowed = 100;
  userPlan.status = 'active';
}
```

**Priority order:**
1. ✅ Free access (if active) → Pro
2. ⬇️ login_users.plan === 0 → Free
3. ⬇️ Stripe subscription → Paid tier

This means free access overrides both Stripe subscriptions and default free tier.

## 📈 User Experience

### For Users with Free Access

- See Pro tier in their account
- Access all Pro features
- See "Free Pro Access" badge in UI (optional)
- No billing/payment pages shown
- Get notification when expiring soon (optional)

### When Free Access Expires

- Automatically reverts to:
  - Stripe subscription tier (if they have one)
  - Free tier (if no subscription)
- No manual intervention needed
- Seamless transition

## 🔐 Security & Access Control

### Who Can Grant Free Access?

Currently, anyone with access to the admin dashboard can grant free access.

**Recommended Production Setup:**
1. Add admin authentication to `/admin` route
2. Log admin email who grants access
3. Restrict to specific admin emails
4. Add approval workflow for large grants (>6 months)

### Audit Trail

Every grant and revoke is logged:
- Who granted/revoked
- When it happened
- Previous and new expiration dates
- Reason provided
- Complete history per user

Query audit log:
```sql
SELECT * FROM free_access_grants
WHERE user_token = 'user-token'
ORDER BY created_at DESC;
```

## 🎓 Examples

### Grant 3 Months to Beta Tester

```bash
curl -X POST https://seoagent.com/api/admin/users/grant-free-access \
  -H "Content-Type: application/json" \
  -d '{
    "userToken": "abc123",
    "months": 3,
    "grantedBy": "admin@seoagent.com",
    "reason": "Beta tester - providing early feedback"
  }'
```

### Extend Existing Free Access

If user already has free access until March 1, granting 3 more months extends to June 1:

```javascript
// Current: free_until = 2026-03-01
// Grant 3 months
// Result: free_until = 2026-06-01 (extended from existing date)
```

### Revoke Access

```bash
curl -X DELETE "https://seoagent.com/api/admin/users/grant-free-access?userToken=abc123&revokedBy=admin@seoagent.com&reason=Abuse"
```

### Check Active Free Access Users

```sql
SELECT * FROM active_free_access_users;
```

Returns:
- User email
- Tier
- Expiration date
- Days remaining
- Who granted it
- Reason

## 🚀 Migration

Run the migration to set up the system:

```bash
# The migration file is: supabase/migrations/065_add_free_access_system.sql

# If using Supabase CLI:
supabase migration up

# Or run the SQL file directly in Supabase Studio
```

## 🧪 Testing

### Test Grant Flow

1. Go to `/admin`
2. Find a test user
3. Click "Grant" button
4. Select 1 month duration
5. Add reason "Testing free access"
6. Click "Grant 1 Month"
7. Verify badge appears with expiration date

### Test User Experience

1. Log in as that user
2. Navigate to account/settings
3. Verify "Pro" tier is shown
4. Try to create >1 website (should work)
5. Try to generate articles (should work)

### Test Expiration

1. Manually set `free_until` to a past date:
```sql
UPDATE user_plans
SET free_until = NOW() - INTERVAL '1 day'
WHERE user_token = 'test-user';
```

2. Refresh user's session
3. Verify they're back to original tier

### Test Revocation

1. Click "Revoke" on a user with free access
2. Confirm the action
3. Verify badge disappears
4. Check user's account shows original tier

## 📊 Analytics Queries

### Total Users with Free Access
```sql
SELECT COUNT(*) FROM active_free_access_users;
```

### Free Access Granted This Month
```sql
SELECT COUNT(*), SUM(months_granted) as total_months
FROM free_access_grants
WHERE created_at >= date_trunc('month', NOW())
AND months_granted > 0; -- Exclude revocations
```

### Most Common Reasons
```sql
SELECT reason, COUNT(*) as count
FROM free_access_grants
WHERE months_granted > 0
GROUP BY reason
ORDER BY count DESC
LIMIT 10;
```

### Expiring Soon (Next 7 Days)
```sql
SELECT *
FROM active_free_access_users
WHERE days_remaining <= 7
ORDER BY days_remaining ASC;
```

## 🔧 Maintenance

### Notify Users Before Expiration

Set up a cron job to email users 7 days before expiration:

```typescript
// /api/cron/free-access-expiring
// Run daily
const { data } = await supabase
  .from('active_free_access_users')
  .select('*')
  .lte('days_remaining', 7)
  .gt('days_remaining', 0);

// Send email notifications
```

### Clean Up Expired Records

Old grants are kept for audit purposes, but you can archive them:

```sql
-- Archive grants older than 2 years
INSERT INTO free_access_grants_archive
SELECT * FROM free_access_grants
WHERE created_at < NOW() - INTERVAL '2 years';

DELETE FROM free_access_grants
WHERE created_at < NOW() - INTERVAL '2 years';
```

## 🎯 Best Practices

1. **Always provide a reason** when granting access
2. **Use consistent admin email** for tracking
3. **Set reasonable durations** (1-6 months typical)
4. **Review active grants monthly** using `active_free_access_users` view
5. **Notify users** before their access expires
6. **Track conversion rates** - how many free users upgrade to paid

## 🐛 Troubleshooting

### User Not Showing Pro Features

Check subscription logic:
```typescript
const { data } = await supabase
  .from('user_plans')
  .select('tier, free_until, status')
  .eq('user_token', userToken)
  .single();

console.log('Current free_until:', data.free_until);
console.log('Is active?', new Date(data.free_until) > new Date());
```

### Grant Not Working

1. Verify migration ran successfully
2. Check function exists:
```sql
SELECT proname FROM pg_proc WHERE proname = 'grant_free_months';
```

3. Check for errors:
```sql
SELECT * FROM free_access_grants WHERE user_token = 'xxx' ORDER BY created_at DESC LIMIT 1;
```

---

**Last Updated**: October 30, 2025
**Version**: 1.0.0
**Migration**: 065_add_free_access_system.sql
