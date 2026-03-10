import { OnboardingStateModel } from '../models/OnboardingStateModel.js';
import { SystemLogger } from '../utils/Logger.js';
import { buildRequestContext, logHandledError } from '../utils/RequestContext.js';

const ALLOWED_ONBOARDING_STATUS = new Set(['in_progress', 'skipped', 'completed']);
const MAX_VERSION_LENGTH = 100;

export const OnboardingStateController = (db) => {
    const model = new OnboardingStateModel(db);
    const logger = new SystemLogger(db);

    return {
        getState: async (req, res) => {
            try {
                const userId = req.authUser?.id;
                if (!userId) {
                    return res.status(401).json({ message: 'Autenticación requerida' });
                }

                const state = await model.getByUserId(userId);
                return res.json({
                    user_id: userId,
                    version: state?.version || null,
                    status: state?.status || null,
                    updated_at: state?.updated_at || null,
                    created_at: state?.created_at || null
                });
            } catch (error) {
                await logHandledError({
                    logger,
                    req,
                    action: 'ONBOARDING_STATE_FETCH_ERROR',
                    error,
                    details: buildRequestContext(req)
                });
                return res.status(500).json({ message: 'Error al consultar estado de onboarding' });
            }
        },

        updateState: async (req, res) => {
            try {
                const userId = req.authUser?.id;
                if (!userId) {
                    return res.status(401).json({ message: 'Autenticación requerida' });
                }

                const status = String(req.body?.status || '').trim();
                const version = req.body?.version == null
                    ? null
                    : String(req.body.version).trim();

                if (!ALLOWED_ONBOARDING_STATUS.has(status)) {
                    return res.status(400).json({ message: 'Estado de onboarding inválido' });
                }

                if (version && version.length > MAX_VERSION_LENGTH) {
                    return res.status(400).json({ message: 'Versión de onboarding inválida' });
                }

                const state = await model.upsertByUserId({
                    userId,
                    version,
                    status
                });

                await logger.business(userId, 'UPDATE_ONBOARDING_STATE', {
                    user_id: userId,
                    status: state?.status || status,
                    version: state?.version || version,
                    ...buildRequestContext(req)
                });

                return res.json({
                    user_id: userId,
                    version: state?.version || null,
                    status: state?.status || status,
                    updated_at: state?.updated_at || null,
                    created_at: state?.created_at || null
                });
            } catch (error) {
                await logHandledError({
                    logger,
                    req,
                    action: 'ONBOARDING_STATE_UPDATE_ERROR',
                    error,
                    details: buildRequestContext(req)
                });
                return res.status(500).json({ message: 'Error al actualizar estado de onboarding' });
            }
        }
    };
};
