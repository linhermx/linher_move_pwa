import { Dropbox, DropboxAuth } from 'dropbox';
import fetch from 'isomorphic-fetch';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import pool from '../config/db.js';
import { sanitizeForLog } from '../utils/RequestContext.js';

export const DropboxService = {
    provider: 'dropbox',
    backupRetentionLimit: 7,

    getConfig() {
        const {
            DROPBOX_CLIENT_ID,
            DROPBOX_CLIENT_SECRET,
            DROPBOX_REDIRECT_URI
        } = process.env;

        if (!DROPBOX_CLIENT_ID || !DROPBOX_CLIENT_SECRET || !DROPBOX_REDIRECT_URI) {
            throw new Error('DROPBOX_CONFIGURATION_MISSING');
        }

        return {
            clientId: DROPBOX_CLIENT_ID,
            clientSecret: DROPBOX_CLIENT_SECRET,
            redirectUri: DROPBOX_REDIRECT_URI
        };
    },

    async getConnection() {
        const [rows] = await pool.query(
            'SELECT * FROM integration_connections WHERE provider = ? LIMIT 1',
            [this.provider]
        );

        return rows[0] || null;
    },

    async upsertConnection(data) {
        await pool.query(
            `
                INSERT INTO integration_connections (
                    provider,
                    status,
                    account_email,
                    account_name,
                    access_token,
                    refresh_token,
                    token_expires_at,
                    connected_by_user_id,
                    last_sync_at,
                    last_error_at,
                    last_error_message
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    status = VALUES(status),
                    account_email = VALUES(account_email),
                    account_name = VALUES(account_name),
                    access_token = VALUES(access_token),
                    refresh_token = VALUES(refresh_token),
                    token_expires_at = VALUES(token_expires_at),
                    connected_by_user_id = VALUES(connected_by_user_id),
                    last_sync_at = VALUES(last_sync_at),
                    last_error_at = VALUES(last_error_at),
                    last_error_message = VALUES(last_error_message)
            `,
            [
                this.provider,
                data.status || 'disconnected',
                data.account_email || null,
                data.account_name || null,
                data.access_token || null,
                data.refresh_token || null,
                data.token_expires_at || null,
                data.connected_by_user_id || null,
                data.last_sync_at || null,
                data.last_error_at || null,
                data.last_error_message || null
            ]
        );
    },

    async createOAuthState(operatorId) {
        const stateToken = typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : crypto.randomBytes(16).toString('hex');
        const expiresAt = new Date(Date.now() + (10 * 60 * 1000));

        await pool.query(
            'INSERT INTO integration_oauth_states (provider, state_token, operator_id, expires_at) VALUES (?, ?, ?, ?)',
            [this.provider, stateToken, operatorId || null, expiresAt]
        );

        return stateToken;
    },

    async consumeOAuthState(stateToken) {
        const [rows] = await pool.query(
            `
                SELECT *
                FROM integration_oauth_states
                WHERE provider = ?
                  AND state_token = ?
                  AND expires_at >= NOW()
                LIMIT 1
            `,
            [this.provider, stateToken]
        );

        if (!rows.length) {
            throw new Error('DROPBOX_STATE_INVALID');
        }

        await pool.query(
            'DELETE FROM integration_oauth_states WHERE id = ?',
            [rows[0].id]
        );

        return rows[0];
    },

    async getAuth() {
        const config = this.getConfig();

        const auth = new DropboxAuth({
            fetch,
            clientId: config.clientId,
            clientSecret: config.clientSecret
        });

        const connection = await this.getConnection();
        if (connection?.access_token) {
            auth.setAccessToken(connection.access_token);
        }
        if (connection?.refresh_token) {
            auth.setRefreshToken(connection.refresh_token);
        }
        if (connection?.token_expires_at) {
            auth.setAccessTokenExpiresAt(new Date(connection.token_expires_at));
        }

        return auth;
    },

    async getClient() {
        const auth = await this.getAuth();
        await auth.checkAndRefreshAccessToken();

        const newAccessToken = auth.getAccessToken();
        const currentConnection = await this.getConnection();
        if (newAccessToken && currentConnection) {
            await this.upsertConnection({
                ...currentConnection,
                status: 'connected',
                access_token: auth.getAccessToken(),
                refresh_token: auth.getRefreshToken(),
                token_expires_at: auth.getAccessTokenExpiresAt(),
                last_error_at: null,
                last_error_message: null
            });
        }

        return new Dropbox({ auth, fetch });
    },

    async getAuthUrl(operatorId) {
        const auth = await this.getAuth();
        const { redirectUri } = this.getConfig();
        const state = await this.createOAuthState(operatorId);

        const authUrl = await auth.getAuthenticationUrl(
            redirectUri,
            state,
            'code',
            'offline',
            null,
            'none',
            false
        );
        return authUrl;
    },

    async saveTokens(code, stateToken) {
        const { redirectUri } = this.getConfig();
        const state = await this.consumeOAuthState(stateToken);
        const auth = await this.getAuth();
        const response = await auth.getAccessTokenFromCode(redirectUri, code);
        const tokens = response.result;
        const expiresAt = tokens.expires_in
            ? new Date(Date.now() + (tokens.expires_in * 1000))
            : null;

        auth.setAccessToken(tokens.access_token);
        if (tokens.refresh_token) {
            auth.setRefreshToken(tokens.refresh_token);
        }
        if (expiresAt) {
            auth.setAccessTokenExpiresAt(expiresAt);
        }

        const dbx = new Dropbox({ auth, fetch });
        const account = await dbx.usersGetCurrentAccount();

        await this.upsertConnection({
            status: 'connected',
            account_email: account.result.email,
            account_name: account.result.name.display_name,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token || auth.getRefreshToken(),
            token_expires_at: expiresAt,
            connected_by_user_id: state.operator_id || null,
            last_error_at: null,
            last_error_message: null
        });

        return {
            operator_id: state.operator_id || null,
            user: {
                emailAddress: account.result.email,
                name: account.result.name.display_name
            }
        };
    },

    async uploadFile(filePath) {
        try {
            const dbx = await this.getClient();
            const fileContent = fs.readFileSync(filePath);
            const fileName = path.basename(filePath);

            const uploadArgs = {
                path: `/${fileName}`,
                contents: fileContent,
                mode: { '.tag': 'overwrite' }
            };

            const response = await dbx.filesUpload(uploadArgs);
            return response.result;
        } catch (error) {
            await this.recordSyncError(error);
            throw error;
        }
    },

    async applyRetentionPolicy() {
        const dbx = await this.getClient();
        const remoteFiles = [];
        let cursor = null;
        let hasMore = true;

        while (hasMore) {
            const response = cursor
                ? await dbx.filesListFolderContinue({ cursor })
                : await dbx.filesListFolder({ path: '' });

            const entries = response.result.entries.filter((entry) => (
                entry['.tag'] === 'file'
                && /^backup_.*\.zip$/i.test(entry.name)
            ));

            remoteFiles.push(...entries);
            hasMore = response.result.has_more;
            cursor = response.result.cursor;
        }

        const filesToDelete = remoteFiles
            .sort((left, right) => (
                new Date(right.server_modified).getTime() - new Date(left.server_modified).getTime()
            ))
            .slice(this.backupRetentionLimit);

        for (const file of filesToDelete) {
            await dbx.filesDeleteV2({ path: file.path_lower || file.path_display });
            await pool.query(
                'DELETE FROM backups WHERE type = "dropbox" AND filename = ?',
                [file.name]
            );
        }
    },

    async recordSyncSuccess() {
        const connection = await this.getConnection();
        if (!connection) {
            return;
        }

        await this.upsertConnection({
            ...connection,
            status: 'connected',
            last_sync_at: new Date(),
            last_error_at: null,
            last_error_message: null
        });
    },

    async recordSyncError(error) {
        const connection = await this.getConnection();
        if (!connection) {
            return;
        }

        await this.upsertConnection({
            ...connection,
            status: 'error',
            last_error_at: new Date(),
            last_error_message: sanitizeForLog(error?.message || 'Dropbox sync error')
        });
    },

    async getStatus() {
        try {
            const connection = await this.getConnection();
            if (!connection || (!connection.access_token && !connection.refresh_token)) {
                return { connected: false };
            }

            const dbx = await this.getClient();
            const account = await dbx.usersGetCurrentAccount();

            await this.upsertConnection({
                ...connection,
                status: 'connected',
                account_email: account.result.email,
                account_name: account.result.name.display_name,
                last_error_at: null,
                last_error_message: null
            });

            return {
                connected: true,
                user: {
                    emailAddress: account.result.email,
                    name: account.result.name.display_name
                },
                last_sync_at: connection.last_sync_at,
                last_error_at: connection.last_error_at,
                last_error_message: connection.last_error_message
            };
        } catch (error) {
            await this.recordSyncError(error);
            const connection = await this.getConnection();
            return {
                connected: false,
                error: error.message,
                last_sync_at: connection?.last_sync_at || null,
                last_error_at: connection?.last_error_at || null,
                last_error_message: connection?.last_error_message || error.message
            };
        }
    },

    async disconnect() {
        const connection = await this.getConnection();
        if (connection) {
            await this.upsertConnection({
                ...connection,
                status: 'disconnected',
                access_token: null,
                refresh_token: null,
                token_expires_at: null,
                last_error_at: null,
                last_error_message: null
            });
        }

        return true;
    }
};
