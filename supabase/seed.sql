-- Seed data for Yieldsmith
-- Development and testing only — DO NOT run in production
-- Wrapped in a transaction so trigger-disable/re-enable is always paired

BEGIN;

ALTER TABLE portfolios DISABLE TRIGGER portfolios_updated_at_trigger;
ALTER TABLE alerts DISABLE TRIGGER alerts_updated_at_trigger;
ALTER TABLE user_settings DISABLE TRIGGER user_settings_updated_at_trigger;
ALTER TABLE dividend_history DISABLE TRIGGER dividend_history_updated_at_trigger;

-- Test user
INSERT INTO user_settings (
  user_id, full_name, email, timezone,
  annual_dividend_goal, monthly_investment_amount, portfolio_value_target,
  preferred_strategies, risk_tolerance, preferred_markets,
  concentration_limit, notification_provider, use_ai_recommendations, ai_provider
) VALUES (
  123456789,
  'Test User',
  'test@example.com',
  'Africa/Lagos',
  500000, 200000, 2000000,
  '["yield-opportunity", "value-entry", "growth-dividend"]',
  'medium', '["ngx"]',
  30.0, 'telegram', TRUE, 'claude'
);

-- Test portfolios (NGX holdings — prices in NGN per share)
INSERT INTO portfolios (user_id, symbol, market_id, quantity, purchase_price, purchase_date, current_price, notes)
VALUES
  (123456789, 'ZENITHBANK', 'ngx', 50.0,   32.50,   '2025-06-15', 34.80,   'Strong dividend payer'),
  (123456789, 'GTCO',       'ngx', 25.0,    7.20,   '2025-07-20',  7.85,   'Quality investment'),
  (123456789, 'DANGOTE',    'ngx', 30.0,  280.00,   '2025-08-10', 290.50,  'Diversification'),
  (123456789, 'AIRTELAFRI', 'ngx', 100.0, 1450.00,  '2025-09-05', 1620.00, 'High growth potential');

-- Test price history (NGN per share, OHLCV)
INSERT INTO price_history (symbol, market_id, open_price, price, high_price, low_price, volume, recorded_date, data_source)
VALUES
  ('ZENITHBANK', 'ngx', 34.50, 34.80, 35.20, 34.50, 5000000, '2026-05-07', 'ngx_pulse'),
  ('ZENITHBANK', 'ngx', 34.20, 34.50, 34.90, 34.20, 4200000, '2026-05-06', 'ngx_pulse'),
  ('ZENITHBANK', 'ngx', 33.90, 34.20, 34.80, 33.90, 5100000, '2026-05-05', 'ngx_pulse'),
  ('ZENITHBANK', 'ngx', 33.70, 33.80, 34.40, 33.70, 4800000, '2026-05-02', 'ngx_pulse'),
  ('ZENITHBANK', 'ngx', 33.20, 33.50, 34.00, 33.20, 4500000, '2026-05-01', 'ngx_pulse'),

  ('GTCO', 'ngx', 7.75, 7.85, 7.95, 7.75, 2500000, '2026-05-07', 'ngx_pulse'),
  ('GTCO', 'ngx', 7.70, 7.75, 7.90, 7.70, 2300000, '2026-05-06', 'ngx_pulse'),
  ('GTCO', 'ngx', 7.60, 7.70, 7.85, 7.60, 2400000, '2026-05-05', 'ngx_pulse'),

  ('DANGOTE', 'ngx', 288.00, 290.50, 292.00, 288.00, 1500000, '2026-05-07', 'ngx_pulse'),
  ('DANGOTE', 'ngx', 287.50, 289.00, 291.50, 287.50, 1600000, '2026-05-06', 'ngx_pulse'),
  ('DANGOTE', 'ngx', 286.00, 287.50, 290.00, 286.00, 1550000, '2026-05-05', 'ngx_pulse'),

  ('AIRTELAFRI', 'ngx', 1600.00, 1620.00, 1650.00, 1600.00, 20000000, '2026-05-07', 'ngx_pulse'),
  ('AIRTELAFRI', 'ngx', 1580.00, 1590.00, 1630.00, 1580.00, 19500000, '2026-05-06', 'ngx_pulse'),
  ('AIRTELAFRI', 'ngx', 1560.00, 1580.00, 1620.00, 1560.00, 20500000, '2026-05-05', 'ngx_pulse');

-- Test dividend history
INSERT INTO dividend_history (
  symbol, market_id, dividend_per_share,
  ex_dividend_date, payment_date, announcement_date, record_date,
  dividend_type, frequency, tax_rate, yield_on_announcement,
  is_projected, is_confirmed
) VALUES
  ('ZENITHBANK', 'ngx', 2.50, '2026-04-15', '2026-05-15', '2026-03-20', '2026-04-20', 'regular', 'annual', 10.00, 7.69, FALSE, TRUE),
  ('ZENITHBANK', 'ngx', 2.00, '2025-04-10', '2025-05-10', '2025-03-15', '2025-04-15', 'regular', 'annual', 10.00, 6.15, FALSE, TRUE),
  ('GTCO',       'ngx', 0.60, '2026-05-01', '2026-05-20', '2026-04-10', '2026-05-05', 'regular', 'annual', 10.00, 8.33, TRUE,  FALSE),
  ('GTCO',       'ngx', 0.50, '2025-05-05', '2025-05-25', '2025-04-15', '2025-05-10', 'regular', 'annual', 10.00, 6.94, FALSE, TRUE),
  ('DANGOTE',    'ngx', 14.50,'2026-05-10', '2026-06-15', '2026-04-20', '2026-05-12', 'regular', 'annual', 10.00, 5.00, TRUE,  FALSE);

-- Test alerts
INSERT INTO alerts (user_id, alert_type, symbol, market_id, title, message, priority, status, severity, notification_provider)
VALUES
  (123456789, 'dividend_announcement', 'ZENITHBANK', 'ngx',
   'ZENITHBANK Dividend Announced', '₦2.50 per share. Payment date: May 15, 2026',
   'high', 'sent', 'info', 'telegram'),
  (123456789, 'rebalance_suggestion', NULL, NULL,
   'Portfolio Rebalancing Suggestion', 'DANGOTE is 24% of your portfolio. Consider reducing to stay below 30%.',
   'medium', 'pending', 'warning', 'telegram'),
  (123456789, 'price_alert', 'GTCO', 'ngx',
   'GTCO Price Alert', 'GTCO has risen 8.3% this week. Strong momentum detected.',
   'medium', 'pending', 'info', 'telegram');

ALTER TABLE portfolios ENABLE TRIGGER portfolios_updated_at_trigger;
ALTER TABLE alerts ENABLE TRIGGER alerts_updated_at_trigger;
ALTER TABLE user_settings ENABLE TRIGGER user_settings_updated_at_trigger;
ALTER TABLE dividend_history ENABLE TRIGGER dividend_history_updated_at_trigger;

COMMIT;

-- Verify row counts
SELECT 'user_settings'     AS table_name, COUNT(*) AS row_count FROM user_settings
UNION ALL SELECT 'portfolios',      COUNT(*) FROM portfolios
UNION ALL SELECT 'price_history',   COUNT(*) FROM price_history
UNION ALL SELECT 'dividend_history',COUNT(*) FROM dividend_history
UNION ALL SELECT 'alerts',          COUNT(*) FROM alerts;
