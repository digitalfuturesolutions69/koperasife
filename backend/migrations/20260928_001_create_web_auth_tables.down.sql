-- ============================================================================
-- Migration : 20260928_001_create_web_auth_tables (DOWN)
-- Purpose   : Roll back AUTH Phase 1 by dropping ONLY the four Web-owned auth
--             tables, in reverse dependency order.
-- Safety    : Names only web_* tables. Never touches pass, CariUser, UPass01,
--             Tanggal, Cabang1, Menu or any other legacy object.
--             Destroys all Web accounts, permissions, sessions and audit rows.
--             Run only with explicit OWNER approval.
-- ============================================================================

DROP TABLE IF EXISTS `web_auth_audit_log`;
DROP TABLE IF EXISTS `web_sessions`;
DROP TABLE IF EXISTS `web_user_permissions`;
DROP TABLE IF EXISTS `web_users`;
