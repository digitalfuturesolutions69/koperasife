-- ============================================================================
-- Migration : 20260928_001_create_web_auth_tables (UP)
-- Purpose   : AUTH Phase 1 - isolated, Web-owned authentication schema.
-- Status    : ALREADY APPLIED to production (kudbantarangin,
--             MariaDB 10.3.39-MariaDB-0ubuntu0.20.04.2) manually by the OWNER.
--             This file documents that DDL; do not re-run it against production.
--
-- Scope     : Creates FOUR new InnoDB tables only:
--               web_users, web_user_permissions, web_sessions, web_auth_audit_log
--             No legacy table, stored procedure, trigger, view, grant or user is
--             referenced or modified. No foreign key points to any legacy (MyISAM)
--             table; the link web_users.username <-> pass.user is logical only.
--
-- Notes     : - CREATE TABLE is deliberately used WITHOUT "IF NOT EXISTS" so an
--               unexpected existing table fails loudly.
--             - DDL auto-commits in MariaDB; if a statement fails, stop and use
--               the matching .down.sql only for tables this migration created.
--             - Technical timestamps are UTC (session time zone below). They are
--               unrelated to the legacy operational date tanggal.tgl.
-- ============================================================================

SET time_zone = '+00:00';

-- ----------------------------------------------------------------------------
-- 1. web_users
-- ----------------------------------------------------------------------------
CREATE TABLE `web_users` (
  `id`                    INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  `username`              VARCHAR(15)
                          CHARACTER SET latin1
                          COLLATE latin1_swedish_ci
                          NOT NULL,
  `display_name`          VARCHAR(100)
                          CHARACTER SET utf8mb4
                          COLLATE utf8mb4_unicode_ci
                          NULL,
  `password_hash`         VARCHAR(255)
                          CHARACTER SET ascii
                          COLLATE ascii_bin
                          NOT NULL,
  `nokk`                  CHAR(3)
                          CHARACTER SET ascii
                          COLLATE ascii_bin
                          NOT NULL,
  `is_active`             TINYINT(1)        NOT NULL DEFAULT 0,
  `must_change_password`  TINYINT(1)        NOT NULL DEFAULT 1,
  `failed_login_count`    SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `last_failed_login_at`  DATETIME(3)       NULL DEFAULT NULL,
  `locked_until`          DATETIME(3)       NULL DEFAULT NULL,
  `password_changed_at`   DATETIME(3)       NOT NULL,
  `last_login_at`         DATETIME(3)       NULL DEFAULT NULL,
  `created_at`            DATETIME(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`            DATETIME(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                              ON UPDATE CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),

  UNIQUE KEY `uq_web_users_username` (`username`),

  KEY `ix_web_users_nokk` (`nokk`),

  CONSTRAINT `ck_web_users_nokk`
    CHECK (`nokk` REGEXP '^[0-9]{3}$'),

  CONSTRAINT `ck_web_users_username`
    CHECK (CHAR_LENGTH(TRIM(`username`)) BETWEEN 1 AND 15),

  CONSTRAINT `ck_web_users_hash`
    CHECK (`password_hash` LIKE '$argon2id$%'),

  CONSTRAINT `ck_web_users_is_active`
    CHECK (`is_active` IN (0,1)),

  CONSTRAINT `ck_web_users_must_chg`
    CHECK (`must_change_password` IN (0,1))

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. web_user_permissions
-- ----------------------------------------------------------------------------
CREATE TABLE `web_user_permissions` (
  `user_id`     INT UNSIGNED NOT NULL,

  `permission`  VARCHAR(64)
                CHARACTER SET ascii
                COLLATE ascii_bin
                NOT NULL,

  `source`      ENUM(
                    'BOOTSTRAP',
                    'ADMIN',
                    'LEGACY_IMPORT'
                )
                NOT NULL,

  `granted_by`  INT UNSIGNED NULL DEFAULT NULL,

  `granted_at`  DATETIME(3)
                NOT NULL
                DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`user_id`, `permission`),

  KEY `ix_wup_permission` (`permission`),

  KEY `ix_wup_granted_by` (`granted_by`),

  CONSTRAINT `fk_wup_user`
    FOREIGN KEY (`user_id`)
    REFERENCES `web_users` (`id`)
    ON DELETE CASCADE
    ON UPDATE RESTRICT,

  CONSTRAINT `fk_wup_granted_by`
    FOREIGN KEY (`granted_by`)
    REFERENCES `web_users` (`id`)
    ON DELETE SET NULL
    ON UPDATE RESTRICT,

  CONSTRAINT `ck_wup_permission`
    CHECK (`permission` REGEXP '^[A-Z][A-Z0-9_]{1,63}$')

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3. web_sessions
-- ----------------------------------------------------------------------------
CREATE TABLE `web_sessions` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

  `user_id`         INT UNSIGNED    NOT NULL,

  `token_hash`      BINARY(32)      NOT NULL,

  `created_at`      DATETIME(3)
                    NOT NULL
                    DEFAULT CURRENT_TIMESTAMP(3),

  `expires_at`      DATETIME(3)
                    NOT NULL,

  `last_seen_at`    DATETIME(3)
                    NOT NULL
                    DEFAULT CURRENT_TIMESTAMP(3),

  `revoked_at`      DATETIME(3)
                    NULL DEFAULT NULL,

  `revoked_reason`  ENUM(
                        'LOGOUT',
                        'LOGOUT_ALL',
                        'PASSWORD_CHANGE',
                        'PASSWORD_RESET',
                        'ADMIN_REVOKE',
                        'ACCOUNT_DISABLED',
                        'ROTATED'
                    )
                    NULL DEFAULT NULL,

  `ip_address`      VARCHAR(45)
                    CHARACTER SET ascii
                    COLLATE ascii_bin
                    NULL DEFAULT NULL,

  `user_agent`      VARCHAR(255)
                    CHARACTER SET utf8mb4
                    COLLATE utf8mb4_unicode_ci
                    NULL DEFAULT NULL,

  PRIMARY KEY (`id`),

  UNIQUE KEY `uq_web_sessions_token_hash` (`token_hash`),

  KEY `ix_web_sessions_user_revoked`
      (`user_id`, `revoked_at`),

  KEY `ix_web_sessions_expires`
      (`expires_at`),

  CONSTRAINT `fk_ws_user`
    FOREIGN KEY (`user_id`)
    REFERENCES `web_users` (`id`)
    ON DELETE CASCADE
    ON UPDATE RESTRICT,

  CONSTRAINT `ck_ws_expiry`
    CHECK (`expires_at` > `created_at`),

  CONSTRAINT `ck_ws_revoked`
    CHECK (
      (`revoked_at` IS NULL) =
      (`revoked_reason` IS NULL)
    )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 4. web_auth_audit_log
-- ----------------------------------------------------------------------------
CREATE TABLE `web_auth_audit_log` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

  `occurred_at`     DATETIME(3)
                    NOT NULL
                    DEFAULT CURRENT_TIMESTAMP(3),

  `event`           ENUM(
                        'LOGIN_SUCCESS',
                        'LOGIN_FAILURE',
                        'LOCKED',
                        'LOGOUT',
                        'LOGOUT_ALL',
                        'PASSWORD_CHANGE',
                        'PASSWORD_RESET',
                        'USER_CREATE',
                        'USER_UPDATE',
                        'USER_DISABLE',
                        'USER_ENABLE',
                        'PERMISSIONS_CHANGE',
                        'SESSIONS_REVOKE',
                        'UNLOCK'
                    )
                    NOT NULL,

  `actor_user_id`   INT UNSIGNED
                    NULL DEFAULT NULL,

  `target_user_id`  INT UNSIGNED
                    NULL DEFAULT NULL,

  `session_id`      BIGINT UNSIGNED
                    NULL DEFAULT NULL,

  `ip_address`      VARCHAR(45)
                    CHARACTER SET ascii
                    COLLATE ascii_bin
                    NULL DEFAULT NULL,

  `outcome`         ENUM(
                        'OK',
                        'DENIED',
                        'ERROR'
                    )
                    NOT NULL,

  `detail_code`     VARCHAR(64)
                    CHARACTER SET ascii
                    COLLATE ascii_bin
                    NULL DEFAULT NULL,

  PRIMARY KEY (`id`),

  KEY `ix_waal_occurred`
      (`occurred_at`),

  KEY `ix_waal_target`
      (`target_user_id`, `occurred_at`),

  CONSTRAINT `fk_waal_actor`
    FOREIGN KEY (`actor_user_id`)
    REFERENCES `web_users` (`id`)
    ON DELETE SET NULL
    ON UPDATE RESTRICT,

  CONSTRAINT `fk_waal_target`
    FOREIGN KEY (`target_user_id`)
    REFERENCES `web_users` (`id`)
    ON DELETE SET NULL
    ON UPDATE RESTRICT

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;
