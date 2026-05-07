-- Migration: Create rate_limit_events table
-- Description: Logs rate limit events for monitoring and analytics
-- Created: 2026-05-07
--
-- Strategy: Upstash Redis handles real-time rate limiting (fast, in-memory).
-- This table logs events for:
--   1. Monitoring which users are hitting rate limits
--   2. Detecting abuse patterns
--   3. Tuning rate limit thresholds
--   4. Historical analytics

CREATE TABLE rate_limit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL,

  -- Rate Limit Details
  limit_type VARCHAR(50) NOT NULL,
  limit_value INT NOT NULL,
  window_seconds INT NOT NULL,

  -- Event Details
  event_type VARCHAR(50) NOT NULL,
  current_count INT NOT NULL,
  attempted_requests INT DEFAULT 1,

  -- Optional Context
  endpoint VARCHAR(100),
  reason TEXT,

  -- Lifecycle (immutable — no updated_at, no update trigger)
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT rate_limit_events_event_type_valid CHECK (event_type IN ('allowed', 'rejected', 'warning')),
  CONSTRAINT rate_limit_events_limit_type_valid CHECK (limit_type IN ('messages_per_minute', 'api_calls_per_hour', 'recommendations_per_day')),
  CONSTRAINT rate_limit_events_positive_count CHECK (current_count >= 0),
  CONSTRAINT rate_limit_events_attempted_positive CHECK (attempted_requests >= 1)
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_events_user_id ON rate_limit_events(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_limit_events_limit_type ON rate_limit_events(limit_type);
CREATE INDEX IF NOT EXISTS idx_rate_limit_events_event_type ON rate_limit_events(event_type);
CREATE INDEX IF NOT EXISTS idx_rate_limit_events_created_at ON rate_limit_events(created_at DESC);

-- Partial index for rejected events (abuse detection)
CREATE INDEX IF NOT EXISTS idx_rate_limit_events_rejected ON rate_limit_events(user_id, created_at DESC)
  WHERE event_type = 'rejected';

COMMENT ON TABLE rate_limit_events IS 'Immutable log of rate limit events for monitoring abuse and tuning thresholds';
COMMENT ON COLUMN rate_limit_events.limit_type IS 'messages_per_minute | api_calls_per_hour | recommendations_per_day';
COMMENT ON COLUMN rate_limit_events.event_type IS 'allowed | rejected | warning';
COMMENT ON COLUMN rate_limit_events.endpoint IS 'Which command triggered this? /recommend, /portfolio, /explore, etc.';

---
-- Usage Examples:
--
-- 1. Real-time rate limiting (Upstash Redis):
--    const count = await redis.incr(`ratelimit:${userId}:messages`);
--    if (count > LIMIT) {
--      await db.insert('rate_limit_events', { event_type: 'rejected', ... });
--      return "Rate limited";
--    }
--
-- 2. Recent rejections by user:
--    SELECT user_id, count(*) AS rejected_count
--    FROM rate_limit_events
--    WHERE event_type = 'rejected'
--      AND created_at > NOW() - INTERVAL '1 hour'
--    GROUP BY user_id
--    ORDER BY rejected_count DESC;
--
-- 3. Repeat offenders (last 24h):
--    SELECT user_id, count(*) AS total_rejections, max(created_at) AS last_hit
--    FROM rate_limit_events
--    WHERE event_type = 'rejected'
--      AND created_at > NOW() - INTERVAL '24 hours'
--    GROUP BY user_id
--    HAVING count(*) > 10
--    ORDER BY total_rejections DESC;
--
-- 4. Abuse by endpoint:
--    SELECT endpoint, count(*) AS rejections
--    FROM rate_limit_events
--    WHERE event_type = 'rejected'
--      AND created_at > NOW() - INTERVAL '1 hour'
--    GROUP BY endpoint
--    ORDER BY rejections DESC;
