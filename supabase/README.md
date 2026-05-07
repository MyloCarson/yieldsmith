# Supabase Database

Database schema and migrations for Yieldsmith bot.

---

## **Overview**

11 main tables:
- **users** — Telegram user accounts and authentication
- **allowlist** — Beta testing allowlist (controls who can access bot)
- **portfolios** — User stock holdings and performance metrics
- **price_history** — Historical stock prices for charts and analysis
- **dividend_history** — Dividend announcements and payments
- **alerts** — User notifications and alerts
- **user_settings** — User preferences and configuration
- **recommendations** — AI-generated recommendations with decision metadata
- **recommendation_criteria** — Individual criterion evaluations per recommendation
- **rate_limit_events** — Logs of rate limit events for monitoring

---

## **Authentication Flow**

**How Users Create Accounts:**

1. User sends `/start` command to Yieldsmith Telegram bot
2. Bot receives message with `user.id`, `user.first_name`, `user.username` from Telegram
3. Bot inserts record into `users` table (user_id = Telegram user ID)
4. User is now authenticated and can use all features

**How User Data is Protected:**

- **Row-Level Security (RLS)** enforces that each user can only access their own data
- When bot processes a request, it sets user context via JWT claim: `{ user_id: 123456789 }`
- All queries are automatically filtered by RLS policies: `WHERE user_id = get_current_user_id()`
- **Market data (prices, dividends)** is public — all users can view
- **Personal data (portfolio, alerts, recommendations)** is private — only user can see theirs

**Example User Journey:**
```
Telegram /start → Bot inserts user (123456789) → user_settings created → User sends /portfolio
→ Bot creates JWT with user_id claim → Supabase RLS filters: only rows with user_id=123456789
→ User sees only their portfolio
```

---

## **Beta Testing & Rate Limiting Strategy**

**Why This Matters:**
- Free Supabase tier has query limits and database size constraints
- Prevent accidental/intentional DB flooding during beta testing
- Monitor resource usage and detect abuse patterns
- Gracefully scale as beta grows

**Two-Layer Protection:**

1. **Allowlist (Database)**
   - Only approved users can create accounts (`users` table)
   - Admin controls who gets access via allowlist approval
   - Prevents random traffic from flooding DB

2. **Rate Limiting (Upstash Redis)**
   - Sliding window rate limiting for all requests
   - Fast, in-memory enforcement (no DB hits)
   - Tracks events in `rate_limit_events` table for monitoring
   - Premium users get higher limits

**Admin Workflow:**
```sql
-- View pending access requests
SELECT * FROM allowlist WHERE status = 'pending' ORDER BY created_at;

-- Approve a user
UPDATE allowlist SET status = 'approved', approved_at = NOW(), approved_by = 'seun'
WHERE user_id = 123456789;

-- Monitor rate limit hits
SELECT user_id, count(*) as rejections
FROM rate_limit_events
WHERE event_type = 'rejected' AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY user_id ORDER BY rejections DESC;

-- Suspend an abusive user
UPDATE allowlist SET status = 'suspended'
WHERE user_id = 999999999;
```

---

## **Running Migrations**

### **Local Development (With Supabase CLI)**

```bash
# Start local Supabase
supabase start

# Run migrations
supabase migration up

# Seed data (optional)
psql -h localhost -U postgres -d postgres -f supabase/seed.sql
```

### **Production (Manual)**

```bash
# Connect to your Supabase project
psql postgresql://user:password@your-project.supabase.co:5432/postgres

# Run each migration in order (DO NOT SKIP OR REORDER)
\i supabase/migrations/001_create_portfolios_table.sql
\i supabase/migrations/002_create_price_history_table.sql
\i supabase/migrations/003_create_dividend_history_table.sql
\i supabase/migrations/004_create_alerts_table.sql
\i supabase/migrations/005_create_user_settings_table.sql
\i supabase/migrations/006_create_recommendations_table.sql
\i supabase/migrations/007_create_recommendation_criteria_table.sql
\i supabase/migrations/008_create_users_table.sql
\i supabase/migrations/009_enable_rls_and_create_policies.sql
\i supabase/migrations/010_create_allowlist_table.sql
\i supabase/migrations/011_create_rate_limit_events_table.sql
\i supabase/migrations/012_enable_rls_on_allowlist_and_rate_limits.sql
```

**Important Migration Order:**
- Migrations 001-008 create base schema
- Migration 009 enables RLS on base tables
- Migrations 010-011 add beta testing & rate limit tracking
- Migration 012 enables RLS on new tables

**DO NOT SKIP OR REORDER** — each migration builds on the previous ones.


### **Using Supabase Dashboard**

1. Go to **SQL Editor** in Supabase dashboard
2. Open each `.sql` file
3. Run queries in order
4. Verify tables exist in **Table Editor**

---

## **Database Design Principles**

### **1. Constraints & Validation**
- All tables have explicit `CHECK` constraints for data integrity
- Foreign key relationships prevent orphaned data
- UNIQUE constraints prevent duplicate entries
- Positive value checks for financial data

### **2. Indexes for Performance**
- Indexes on user queries: `user_id`, `symbol`, `market_id`
- Time-based indexes: `created_at`, `payment_date`, `scheduled_for`
- Partial indexes for filtered queries: `is_valid`, `status = 'pending'`

### **3. Auto-Timestamps**
- All tables have `created_at` and `updated_at` (where relevant)
- Triggers automatically update `updated_at` on any change
- No manual timestamp management needed

### **4. Generated Columns**
- `portfolios.total_invested` — Calculated from `quantity × purchase_price`
- `portfolios.current_value` — Calculated from `quantity × current_price`
- `portfolios.unrealized_gain` — Auto-calculated from prices
- `dividend_history.net_dividend_per_share` — Tax-adjusted automatically

### **5. Flexible JSONB Columns**
- `alerts.alert_data` — Structured rich notification data
- `user_settings.preferred_strategies` — Array of strategy IDs
- `user_settings.preferred_markets` — Array of market IDs
- `user_settings.excluded_sectors` — Array of excluded sectors
- Allows extension without schema changes

---

## **Table Relationships**

```
BETA TESTING & RATE LIMITING
├─ allowlist (admin-managed)
│  └─ user_id (controls access to users table)
└─ rate_limit_events (auto-logged by bot)
   └─ user_id (tracks rate limit violations)

CORE AUTHENTICATION & DATA
users (PRIMARY AUTH)
  ├─ user_id → portfolios
  ├─ user_id → alerts
  ├─ user_id → recommendations
  ├─ user_id → user_settings
  └─ subscription_tier, is_active (controls feature access)

portfolios
  ├─ user_id → users
  └─ symbol, market_id → price_history, dividend_history

price_history
  └─ symbol, market_id (market data, shared across users)

dividend_history
  └─ symbol, market_id (market data, shared across users)

alerts
  ├─ user_id → users
  └─ symbol, market_id → (optional, triggers based on holdings)

user_settings
  └─ user_id → users (user's preferences and configuration)

recommendations
  ├─ user_id → users
  └─ id → recommendation_criteria (1:many)

recommendation_criteria
  └─ recommendation_id → recommendations
```

**Key Design Principles:**
- `allowlist` controls who can create accounts (beta testing protection)
- `users` is the central authentication table (primary key = Telegram user_id)
- `rate_limit_events` logs violations for monitoring and abuse detection
- All user data is keyed by `user_id` for RLS filtering
- Market data (prices, dividends) is shared (public read)
- Personal data (portfolio, alerts, recommendations, settings) is private (user-only access)
- Upstash Redis enforces real-time rate limits (fast, no DB calls)


---

## **Common Queries**

### **Get User Portfolio**
```sql
SELECT * FROM portfolios 
WHERE user_id = 123456789 AND is_active = TRUE
ORDER BY current_value DESC;
```

### **Calculate Portfolio Value**
```sql
SELECT 
  user_id,
  SUM(current_value) as total_value,
  SUM(total_invested) as total_invested,
  SUM(unrealized_gain) as total_unrealized_gain
FROM portfolios
WHERE user_id = 123456789 AND is_active = TRUE
GROUP BY user_id;
```

### **Get Pending Dividends**
```sql
SELECT * FROM dividend_history
WHERE is_projected = TRUE 
  AND payment_date >= CURRENT_DATE
ORDER BY payment_date ASC;
```

### **Get Pending Alerts**
```sql
SELECT * FROM alerts
WHERE user_id = 123456789 
  AND status = 'pending'
ORDER BY priority DESC, created_at DESC;
```

---

## **Upstash Redis Setup (Rate Limiting)**

**Why Upstash?**
- Fast, serverless Redis (no server to manage)
- Free tier includes 10K commands/day (more than enough for rate limiting)
- REST API (works with Telegram bot without special libraries)
- Perfect for implementing sliding window rate limiting

**Setup Steps:**

1. **Create Upstash Account:**
   - Go to https://upstash.com
   - Sign up with GitHub or email
   - Create a new Redis database (free tier)

2. **Get Credentials:**
   - In Upstash dashboard, click your database
   - Copy "REST URL" and "REST Token"
   - Add to `.env`:
     ```bash
     UPSTASH_REDIS_REST_URL=https://your-url.upstash.io
     UPSTASH_REDIS_REST_TOKEN=your_token_here
     ```

3. **Configure Rate Limits:**
   - Edit `config/rate-limits.config.json`
   - Adjust thresholds for your needs:
     - `messages_per_minute`: 10 (default)
     - `api_calls_per_hour`: 100 (default)
     - `recommendations_per_day`: 5 (default)

4. **In Phase 1+, bot will:**
   - Check Upstash Redis before processing each request
   - Increment counter: `redis.incr(ratelimit:${userId}:${limitType})`
   - Log violations to `rate_limit_events` table
   - Return 429 Too Many Requests if limit exceeded

**Monitoring Rate Limits:**
```sql
-- See which users are hitting limits
SELECT user_id, count(*) as rejections
FROM rate_limit_events
WHERE event_type = 'rejected' AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY user_id
ORDER BY rejections DESC;

-- Find repeat offenders
SELECT user_id, count(*) as total_violations
FROM rate_limit_events
WHERE event_type = 'rejected' AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY user_id
HAVING count(*) > 10;
```

**Adjusting Limits for Premium Users:**
- In `config/rate-limits.config.json`, `exemptions.premium_users` section
- Bot checks `user_settings.subscription_tier` and applies higher limits
- Example: Premium users get 20 recommendations/day instead of 5

---

## **Data Types Used**

| Type | Purpose | Example |
|------|---------|---------|
| `UUID` | Primary keys (unique across all databases) | `gen_random_uuid()` |
| `BIGINT` | Telegram user IDs (large integers) | `123456789` |
| `VARCHAR(n)` | Text with maximum length | `symbol: VARCHAR(20)` |
| `DECIMAL(p, s)` | Financial data (precise decimals) | `quantity: DECIMAL(15, 4)` |
| `DATE` | Calendar dates | `2026-05-07` |
| `TIMESTAMP` | Date and time with timezone | `CURRENT_TIMESTAMP` |
| `BOOLEAN` | True/false flags | `is_active BOOLEAN` |
| `JSONB` | Structured flexible data | Strategy preferences |

---

## **Security Considerations**

### **Row-Level Security (RLS) — IMPLEMENTED**
✅ RLS is enabled on all tables (migration 009)

- **How it works:** Each request includes JWT with `user_id` claim
- **Automatic filtering:** All queries are filtered by `get_current_user_id()` function
- **Exceptions:**
  - `price_history` — public read (all users can view market data)
  - `dividend_history` — public read (all users can view market data)
- **Testing RLS locally:**
  ```sql
  -- Set user context
  SELECT set_config('app.current_user_id', '123456789', false);
  -- Query returns only that user's data
  SELECT * FROM portfolios;
  
  -- Switch user
  SELECT set_config('app.current_user_id', '999999999', false);
  SELECT * FROM portfolios;  -- Different data for different user
  ```

### **JWT Claims Setup**
When bot sends request to Supabase:
```javascript
// Bot creates JWT with custom claim
const token = sign(
  { user_id: telegramUserId, role: 'authenticated' },
  JWT_SECRET
);
// Supabase verifies JWT and sets context for RLS policies
```

### **API Keys & Secrets**
- Store in environment variables (never in database)
- Use Supabase Secrets for sensitive config
- Rotate API keys regularly

### **Backup Strategy**
- Daily automated backups via Supabase
- Point-in-time recovery (automatic)
- Manual export before major changes
- Test recovery procedures monthly

---

## **Maintenance**

### **Check Table Sizes**
```sql
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### **Cleanup Expired Alerts**
```sql
DELETE FROM alerts 
WHERE expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP;
```

### **Archive Old Price History**
```sql
DELETE FROM price_history
WHERE recorded_date < CURRENT_DATE - INTERVAL '2 years';
```

---

## **Setup Checklist**

### **Database Setup**
1. ✅ Run migrations 001-012 in order
2. ✅ Row-Level Security (RLS) enabled on all tables
3. ✅ Users table created (primary auth table)
4. ✅ Allowlist table created (beta testing protection)
5. ✅ Rate limit events table created (monitoring)
6. Run seed data (optional):
   ```bash
   psql -h localhost -U postgres -d postgres -f supabase/seed.sql
   ```

### **Verification**
7. Test migrations:
   ```bash
   # Verify all tables exist (should show 11 tables)
   psql ... -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
   
   # Verify RLS is enabled on all tables
   psql ... -c "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';"
   ```

8. Test RLS policies locally (see RLS Testing section above)

### **External Services**
9. **Upstash Redis Setup:**
   - Create free account at https://upstash.com
   - Create Redis database
   - Copy REST URL and token
   - Add to `.env` as `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

10. Set up automated backups in Supabase dashboard

### **Allowlist Management (Beta Testing)**
11. Add yourself as admin:
    ```sql
    INSERT INTO allowlist (user_id, telegram_username, status, approved_by, approval_reason)
    VALUES (123456789, 'seun', 'approved', 'seun', 'admin/founder');
    ```

12. Create admin interface for approving users (Phase 1+ bot feature)
    ```sql
    SELECT * FROM allowlist WHERE status = 'pending' ORDER BY created_at;
    ```

### **Bot Integration (Phase 1+)**
13. Configure bot to check allowlist on `/start` command
14. Generate JWT tokens with `user_id` claim
15. Implement Upstash rate limiting checks
16. Log rate limit violations to `rate_limit_events` table

---

## **Bot Integration (Next Phase)**

When implementing the Telegram bot in Phase 1+, you'll need:

1. **User Creation Handler:**
   ```sql
   INSERT INTO users (user_id, telegram_username, first_name, last_name)
   VALUES ($1, $2, $3, $4)
   ON CONFLICT (user_id) DO UPDATE SET last_active_at = NOW();
   ```

2. **JWT Token Generation:**
   ```javascript
   const jwt = sign(
     { user_id: msg.from.id, role: 'authenticated' },
     process.env.SUPABASE_JWT_SECRET,
     { expiresIn: '1h' }
   );
   ```

3. **Supabase Client Setup:**
   ```javascript
   const client = createClient(
     process.env.SUPABASE_URL,
     process.env.SUPABASE_ANON_KEY,
     { global: { headers: { Authorization: `Bearer ${jwt}` } } }
   );
   ```

This ensures all queries are automatically filtered by RLS policies.
