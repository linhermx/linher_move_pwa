/* eslint-disable react-refresh/only-export-components */
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ModalShell from '../components/ModalShell';
import { hasPermission } from '../utils/session';

const OnboardingContext = createContext(null);

const ONBOARDING_VERSION = 'ux-onboarding-v2';
const ONBOARDING_STORAGE_PREFIX = 'ux-onboarding-state';
const SPOTLIGHT_PADDING = 8;
const CARD_MAX_WIDTH = 360;
const CARD_MARGIN = 12;
const CARD_GAP = 14;
const DEFAULT_CARD_HEIGHT = 248;

const ONBOARDING_STATUS = {
    IN_PROGRESS: 'in_progress',
    SKIPPED: 'skipped',
    COMPLETED: 'completed'
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getStorageKey = (userId) => `${ONBOARDING_STORAGE_PREFIX}:${userId}`;

const readPersistedOnboarding = (userId) => {
    if (!userId) {
        return null;
    }

    const storageKey = getStorageKey(userId);
    const sources = [localStorage, sessionStorage];

    for (const source of sources) {
        try {
            const raw = source.getItem(storageKey);
            if (!raw) {
                continue;
            }

            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                return parsed;
            }
        } catch {
            // Ignore malformed onboarding state.
        }
    }

    return null;
};

const persistOnboardingState = (userId, payload) => {
    if (!userId) {
        return;
    }

    const storageKey = getStorageKey(userId);
    const serialized = JSON.stringify(payload);
    const targets = [localStorage, sessionStorage];

    for (const target of targets) {
        try {
            target.setItem(storageKey, serialized);
        } catch {
            // Ignore storage write failures.
        }
    }
};

const isRectRenderable = (rect) => rect && rect.width > 0 && rect.height > 0;

const isRectInViewport = (rect) => (
    rect.bottom > 0
    && rect.top < window.innerHeight
    && rect.right > 0
    && rect.left < window.innerWidth
);

const isRectFullyVisible = (rect, padding = 18) => (
    rect.top >= padding
    && rect.left >= padding
    && rect.bottom <= (window.innerHeight - padding)
    && rect.right <= (window.innerWidth - padding)
);

const areRectsClose = (a, b) => {
    if (!a && !b) {
        return true;
    }

    if (!a || !b) {
        return false;
    }

    return (
        Math.abs(a.top - b.top) < 1
        && Math.abs(a.left - b.left) < 1
        && Math.abs(a.width - b.width) < 1
        && Math.abs(a.height - b.height) < 1
    );
};

const getFirstRenderableTarget = (selectors = []) => {
    for (const selector of selectors) {
        if (!selector) {
            continue;
        }

        const element = document.querySelector(selector);
        if (!element) {
            continue;
        }

        const rect = element.getBoundingClientRect();
        if (!isRectRenderable(rect)) {
            continue;
        }

        return { element, rect, selector };
    }

    return null;
};

const buildOnboardingSteps = () => ([
    {
        id: 'onb_welcome',
        type: 'welcome',
        title: 'Bienvenido a LINHER Move',
        description: 'Te mostraremos un tour breve por los módulos clave para ubicar cada flujo.'
    },
    {
        id: 'onb_module_dashboard',
        route: '/',
        title: 'Dashboard',
        description: 'Aquí ves el estado general de la operación y los indicadores más importantes del día.',
        selectors: ['[data-onboarding="sidebar-dashboard"]', '#app-sidebar .sidebar__nav .sidebar__link[href="/"]'],
        fallbackSelectors: ['.app-shell__mobile-trigger', '[data-onboarding="dashboard-header"]', '.page-shell .page-header'],
        placement: 'right',
        sidebarStep: true,
        allowInteraction: true
    },
    {
        id: 'onb_module_settings',
        route: '/settings',
        permission: 'edit_settings',
        title: 'Ajustes',
        description: 'Define parámetros globales del sistema para que los cálculos usen reglas base correctas.',
        selectors: ['[data-onboarding="sidebar-settings"]', '#app-sidebar .sidebar__nav .sidebar__link[href="/settings"]'],
        fallbackSelectors: ['.app-shell__mobile-trigger', '#settings-default-origin-address', '.page-shell .page-header'],
        placement: 'right',
        sidebarStep: true,
        allowInteraction: true
    },
    {
        id: 'onb_module_fleet',
        route: '/fleet',
        permission: 'manage_fleet',
        title: 'Flota',
        description: 'Administra vehículos, rendimiento y disponibilidad de unidades para la operación.',
        selectors: ['[data-onboarding="sidebar-fleet"]', '#app-sidebar .sidebar__nav .sidebar__link[href="/fleet"]'],
        fallbackSelectors: ['.app-shell__mobile-trigger', '.page-shell .page-header', '.resource-cards-grid'],
        placement: 'right',
        sidebarStep: true,
        allowInteraction: true
    },
    {
        id: 'onb_module_services',
        route: '/services',
        permission: 'manage_services',
        title: 'Servicios',
        description: 'Configura maniobras y servicios adicionales que impactan tiempo y costo de la cotización.',
        selectors: ['[data-onboarding="sidebar-services"]', '#app-sidebar .sidebar__nav .sidebar__link[href="/services"]'],
        fallbackSelectors: ['.app-shell__mobile-trigger', '.page-shell .page-header', '.resource-cards-grid'],
        placement: 'right',
        sidebarStep: true,
        allowInteraction: true
    },
    {
        id: 'onb_module_new_quote',
        route: '/new-quote',
        permission: 'create_quotation',
        title: 'Nueva cotización',
        description: 'Este módulo te permite capturar ruta, elegir unidad y calcular el costo final del viaje.',
        selectors: ['[data-onboarding="sidebar-new-quote"]', '#app-sidebar .sidebar__nav .sidebar__link[href="/new-quote"]'],
        fallbackSelectors: ['.app-shell__mobile-trigger', '[data-onboarding="quote-calculate"]', '.workspace-shell__panel'],
        placement: 'right',
        sidebarStep: true,
        allowInteraction: true
    },
    {
        id: 'onb_module_history',
        route: '/history',
        permission: 'view_history',
        title: 'Historial',
        description: 'Aquí consultas cotizaciones previas, su estatus y detalles para dar seguimiento.',
        selectors: ['[data-onboarding="sidebar-history"]', '#app-sidebar .sidebar__nav .sidebar__link[href="/history"]'],
        fallbackSelectors: ['.app-shell__mobile-trigger', '.page-shell .page-header', '#history-search'],
        placement: 'right',
        sidebarStep: true,
        allowInteraction: true
    },
    {
        id: 'onb_module_reports',
        route: '/reports',
        permission: 'view_reports',
        title: 'Reportes',
        description: 'Este módulo concentra análisis y métricas para revisar resultados operativos y financieros.',
        selectors: ['[data-onboarding="sidebar-reports"]', '#app-sidebar .sidebar__nav .sidebar__link[href="/reports"]'],
        fallbackSelectors: ['.app-shell__mobile-trigger', '.reports-page .page-header', '.reports-tabs'],
        placement: 'right',
        sidebarStep: true,
        allowInteraction: true
    }
]);

const resolveCardPosition = (rect, placement, cardHeight = DEFAULT_CARD_HEIGHT) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const cardWidth = Math.min(CARD_MAX_WIDTH, viewportWidth - (CARD_MARGIN * 2));

    if (!rect || !isRectInViewport(rect)) {
        return {
            mode: 'center',
            style: { width: `${cardWidth}px` }
        };
    }

    let top = rect.bottom + CARD_GAP;
    let left = rect.left + (rect.width / 2) - (cardWidth / 2);

    if (placement === 'top') {
        top = rect.top - cardHeight - CARD_GAP;
        left = rect.left + (rect.width / 2) - (cardWidth / 2);
    }

    if (placement === 'left') {
        top = rect.top + (rect.height / 2) - (cardHeight / 2);
        left = rect.left - cardWidth - CARD_GAP;
    }

    if (placement === 'right') {
        top = rect.top + (rect.height / 2) - (cardHeight / 2);
        left = rect.right + CARD_GAP;
    }

    const maxLeft = Math.max(CARD_MARGIN, viewportWidth - cardWidth - CARD_MARGIN);
    const maxTop = Math.max(CARD_MARGIN, viewportHeight - cardHeight - CARD_MARGIN);

    return {
        mode: 'anchored',
        style: {
            width: `${cardWidth}px`,
            top: `${clamp(top, CARD_MARGIN, maxTop)}px`,
            left: `${clamp(left, CARD_MARGIN, maxLeft)}px`
        }
    };
};

export const OnboardingProvider = ({ children, user }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const cardRef = useRef(null);
    const currentStepIdRef = useRef(null);
    const autoScrolledStepRef = useRef(null);
    const autoOpenedSidebarStepRef = useRef(null);
    const skippedReasonsRef = useRef([]);

    const [isActive, setIsActive] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const [sessionStartIndex, setSessionStartIndex] = useState(0);
    const [cardHeight, setCardHeight] = useState(DEFAULT_CARD_HEIGHT);
    const [storageRevision, setStorageRevision] = useState(0);
    const [completionRedirectTo, setCompletionRedirectTo] = useState(null);
    const [targetState, setTargetState] = useState({
        rect: null,
        source: 'none'
    });

    const userId = user?.id || null;
    const onboardingRecord = useMemo(() => {
        // Re-evaluate record after local writes that bump storageRevision.
        void storageRevision;
        return userId ? readPersistedOnboarding(userId) : null;
    }, [storageRevision, userId]);
    const completedStepIdsRef = useRef(new Set(onboardingRecord?.completed_step_ids || []));

    const { steps, permissionSkippedSteps } = useMemo(() => {
        const builtSteps = buildOnboardingSteps();
        const skipped = [];
        const visible = [];

        for (const step of builtSteps) {
            if (step.permission && !hasPermission(user, step.permission)) {
                skipped.push({ id: step.id, reason: 'missing_permission' });
                continue;
            }

            visible.push(step);
        }

        return { steps: visible, permissionSkippedSteps: skipped };
    }, [user]);

    const currentStep = isActive ? steps[activeIndex] : null;
    const actionableSteps = useMemo(
        () => steps.filter((step) => step.type !== 'welcome'),
        [steps]
    );
    const currentActionableIndex = useMemo(() => (
        actionableSteps.findIndex((step) => step.id === currentStep?.id)
    ), [actionableSteps, currentStep?.id]);
    const completedStepCount = useMemo(() => {
        const completedIds = new Set(onboardingRecord?.completed_step_ids || []);
        return actionableSteps.reduce((count, step) => count + (completedIds.has(step.id) ? 1 : 0), 0);
    }, [actionableSteps, onboardingRecord]);
    const hasCompletedAllActionableSteps = useMemo(() => (
        actionableSteps.length > 0
            ? completedStepCount >= actionableSteps.length
            : true
    ), [actionableSteps.length, completedStepCount]);
    const hasCompletedOnboarding = onboardingRecord?.version === ONBOARDING_VERSION
        && (
            onboardingRecord?.status === ONBOARDING_STATUS.COMPLETED
            || hasCompletedAllActionableSteps
        );
    const shouldShowGuideTrigger = !hasCompletedOnboarding;
    const welcomeProgressBucket = useMemo(() => {
        if (!actionableSteps.length) {
            return '10';
        }

        const ratio = completedStepCount / actionableSteps.length;
        if (ratio >= 1) {
            return '100';
        }
        if (ratio >= 0.75) {
            return '75';
        }
        if (ratio >= 0.5) {
            return '50';
        }
        if (ratio >= 0.25) {
            return '25';
        }

        return '10';
    }, [actionableSteps.length, completedStepCount]);

    useEffect(() => {
        completedStepIdsRef.current = new Set(onboardingRecord?.completed_step_ids || []);
    }, [onboardingRecord, userId]);

    const persistRecord = useCallback((nextRecord) => {
        if (!userId) {
            return;
        }

        persistOnboardingState(userId, nextRecord);
        setStorageRevision((currentRevision) => currentRevision + 1);
    }, [userId]);

    const registerSkippedReason = useCallback((stepId, reason) => {
        if (!stepId || !reason) {
            return;
        }

        const exists = skippedReasonsRef.current.some(
            (entry) => entry.id === stepId && entry.reason === reason
        );

        if (!exists) {
            skippedReasonsRef.current = [...skippedReasonsRef.current, { id: stepId, reason }];
        }
    }, []);

    const closeTour = useCallback((status) => {
        setIsActive(false);
        setTargetState({ rect: null, source: 'none' });
        currentStepIdRef.current = null;

        if (!userId || !status) {
            return;
        }

        const baseCompletedStepIds = status === ONBOARDING_STATUS.COMPLETED
            ? actionableSteps.map((step) => step.id)
            : Array.from(completedStepIdsRef.current);
        const actionableStepIds = actionableSteps.map((step) => step.id);
        const completedSet = new Set(baseCompletedStepIds);
        const hasCoveredAllActionableSteps = actionableStepIds.every((stepId) => completedSet.has(stepId));
        const finalStatus = hasCoveredAllActionableSteps
            ? ONBOARDING_STATUS.COMPLETED
            : status;
        const completedStepIds = hasCoveredAllActionableSteps
            ? actionableStepIds
            : Array.from(completedSet);

        completedStepIdsRef.current = new Set(completedStepIds);

        persistRecord({
            status: finalStatus,
            version: ONBOARDING_VERSION,
            updated_at: new Date().toISOString(),
            skipped_reasons: skippedReasonsRef.current,
            completed_step_ids: completedStepIds
        });
    }, [actionableSteps, persistRecord, userId]);

    const startTour = useCallback((options = {}) => {
        if (!steps.length || !userId) {
            return;
        }

        const { origin = 'manual', startFromWelcome = true } = options;
        const defaultManualStepIndex = steps.findIndex((step) => step.type !== 'welcome');
        const initialIndex = origin === 'auto' || startFromWelcome
            ? 0
            : (defaultManualStepIndex >= 0 ? defaultManualStepIndex : 0);

        completedStepIdsRef.current = new Set(onboardingRecord?.completed_step_ids || []);
        skippedReasonsRef.current = [...permissionSkippedSteps];
        const baseRecord = readPersistedOnboarding(userId) || {};
        const nextStatus = baseRecord.status === ONBOARDING_STATUS.COMPLETED
            ? ONBOARDING_STATUS.COMPLETED
            : ONBOARDING_STATUS.IN_PROGRESS;
        persistRecord({
            ...baseRecord,
            status: nextStatus,
            version: ONBOARDING_VERSION,
            updated_at: new Date().toISOString(),
            completed_step_ids: Array.from(completedStepIdsRef.current),
            skipped_reasons: skippedReasonsRef.current
        });
        setCompletionRedirectTo(null);
        setSessionStartIndex(initialIndex);
        setActiveIndex(initialIndex);
        setIsActive(true);
    }, [onboardingRecord, permissionSkippedSteps, persistRecord, steps, userId]);

    const recordStepAsCompleted = useCallback((stepId) => {
        if (!stepId || !userId) {
            return;
        }

        if (completedStepIdsRef.current.has(stepId)) {
            return;
        }

        completedStepIdsRef.current.add(stepId);
        const baseRecord = readPersistedOnboarding(userId) || {};
        const hasCoveredAllActionableSteps = actionableSteps.every((step) => (
            completedStepIdsRef.current.has(step.id)
        ));
        const nextStatus = baseRecord.status === ONBOARDING_STATUS.COMPLETED || hasCoveredAllActionableSteps
            ? ONBOARDING_STATUS.COMPLETED
            : ONBOARDING_STATUS.IN_PROGRESS;
        const nextCompletedStepIds = hasCoveredAllActionableSteps
            ? actionableSteps.map((step) => step.id)
            : Array.from(completedStepIdsRef.current);
        completedStepIdsRef.current = new Set(nextCompletedStepIds);

        persistRecord({
            ...baseRecord,
            status: nextStatus,
            version: ONBOARDING_VERSION,
            updated_at: new Date().toISOString(),
            completed_step_ids: nextCompletedStepIds,
            skipped_reasons: skippedReasonsRef.current
        });
    }, [actionableSteps, persistRecord, userId]);

    const skipTour = useCallback(() => {
        closeTour(ONBOARDING_STATUS.SKIPPED);
    }, [closeTour]);

    const finishTour = useCallback(() => {
        closeTour(ONBOARDING_STATUS.COMPLETED);
        setCompletionRedirectTo(hasPermission(user, 'edit_settings') ? '/settings' : '/');
    }, [closeTour, user]);

    const handleCompletionClose = useCallback(() => {
        if (!completionRedirectTo) {
            return;
        }

        const nextRoute = completionRedirectTo;
        setCompletionRedirectTo(null);
        navigate(nextRoute);
    }, [completionRedirectTo, navigate]);

    const goToNextStep = useCallback((options = {}) => {
        if (!isActive || !currentStep) {
            return;
        }

        const { skipReason = null } = options;
        if (skipReason) {
            registerSkippedReason(currentStep.id, skipReason);
        }

        if (currentStep.type !== 'welcome' && targetState.source === 'none') {
            registerSkippedReason(currentStep.id, 'target_not_found');
        }

        if (activeIndex >= steps.length - 1) {
            finishTour();
            return;
        }

        setActiveIndex((index) => Math.min(index + 1, steps.length - 1));
    }, [
        activeIndex,
        currentStep,
        finishTour,
        isActive,
        registerSkippedReason,
        steps.length,
        targetState.source
    ]);

    const goToPreviousStep = useCallback(() => {
        setActiveIndex((index) => Math.max(index - 1, sessionStartIndex));
    }, [sessionStartIndex]);

    useEffect(() => {
        if (!isActive) {
            return undefined;
        }

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                skipTour();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isActive, skipTour]);

    useEffect(() => {
        if (!isActive || !currentStep || currentStep.type === 'welcome') {
            return undefined;
        }

        const timerId = window.setTimeout(() => {
            recordStepAsCompleted(currentStep.id);
        }, 0);

        return () => {
            window.clearTimeout(timerId);
        };
    }, [currentStep, isActive, recordStepAsCompleted]);

    useEffect(() => {
        document.body.classList.toggle('onboarding-active', isActive);

        return () => {
            document.body.classList.remove('onboarding-active');
        };
    }, [isActive]);

    useEffect(() => {
        if (!userId || location.pathname === '/login' || isActive || !steps.length) {
            return undefined;
        }

        const persistedState = readPersistedOnboarding(userId);
        const persistedCompletedIds = new Set(persistedState?.completed_step_ids || []);
        const hasCoveredAllActionableSteps = actionableSteps.length > 0 && actionableSteps.every((step) => (
            persistedCompletedIds.has(step.id)
        ));
        const hasValidState = persistedState
            && persistedState.version === ONBOARDING_VERSION
            && (
                persistedState.status === ONBOARDING_STATUS.SKIPPED
                || persistedState.status === ONBOARDING_STATUS.COMPLETED
                || hasCoveredAllActionableSteps
            );

        if (hasValidState) {
            return undefined;
        }

        // Defer auto-start slightly so route/layout transitions finish first.
        const timerId = window.setTimeout(() => {
            startTour({ origin: 'auto' });
        }, 120);

        return () => {
            window.clearTimeout(timerId);
        };
    }, [actionableSteps, isActive, location.pathname, startTour, steps.length, userId]);

    useEffect(() => {
        if (!isActive || !currentStep?.route) {
            return;
        }

        if (location.pathname !== currentStep.route) {
            navigate(currentStep.route);
        }
    }, [currentStep?.route, isActive, location.pathname, navigate]);

    useEffect(() => {
        if (!isActive || !currentStep || currentStep.type === 'welcome') {
            currentStepIdRef.current = currentStep?.id || null;
            autoScrolledStepRef.current = null;
            const frameId = window.requestAnimationFrame(() => {
                setTargetState({ rect: null, source: 'none' });
            });

            return () => {
                window.cancelAnimationFrame(frameId);
            };
        }

        if (typeof window === 'undefined') {
            return undefined;
        }

        if (currentStepIdRef.current !== currentStep.id) {
            autoScrolledStepRef.current = null;
            autoOpenedSidebarStepRef.current = null;
        }

        const updateTarget = () => {
            const isMobileViewport = window.matchMedia('(max-width: 768px)').matches;
            if (isMobileViewport && currentStep.sidebarStep) {
                const sidebarNode = document.querySelector('#app-sidebar.sidebar--mobile');
                const isSidebarClosed = sidebarNode && !sidebarNode.classList.contains('sidebar--mobile-open');
                const trigger = document.querySelector('.app-shell__mobile-trigger');
                const sidebarOpenAttemptKey = `${currentStep.id}:${location.pathname}`;

                if (isSidebarClosed && trigger instanceof HTMLElement && autoOpenedSidebarStepRef.current !== sidebarOpenAttemptKey) {
                    autoOpenedSidebarStepRef.current = sidebarOpenAttemptKey;
                    trigger.click();
                    return;
                }
            }

            const primary = getFirstRenderableTarget(currentStep.selectors || []);
            if (primary) {
                if (!isRectFullyVisible(primary.rect) && autoScrolledStepRef.current !== currentStep.id) {
                    primary.element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
                    autoScrolledStepRef.current = currentStep.id;
                }

                setTargetState((current) => {
                    if (current.source === 'primary' && areRectsClose(current.rect, primary.rect)) {
                        return current;
                    }

                    return {
                        rect: primary.rect,
                        source: 'primary'
                    };
                });
                return;
            }

            const fallback = getFirstRenderableTarget(currentStep.fallbackSelectors || []);
            if (fallback) {
                setTargetState((current) => {
                    if (current.source === 'fallback' && areRectsClose(current.rect, fallback.rect)) {
                        return current;
                    }

                    return {
                        rect: fallback.rect,
                        source: 'fallback'
                    };
                });
                return;
            }

            setTargetState((current) => {
                if (current.source === 'none' && current.rect === null) {
                    return current;
                }

                return {
                    rect: null,
                    source: 'none'
                };
            });
        };

        updateTarget();
        currentStepIdRef.current = currentStep.id;

        const intervalId = window.setInterval(updateTarget, 240);
        const handleViewportChange = () => window.requestAnimationFrame(updateTarget);

        window.addEventListener('resize', handleViewportChange);
        window.addEventListener('scroll', handleViewportChange, true);

        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener('resize', handleViewportChange);
            window.removeEventListener('scroll', handleViewportChange, true);
        };
    }, [currentStep, isActive, location.pathname]);

    useEffect(() => {
        if (!isActive || !cardRef.current) {
            return;
        }

        const nextHeight = cardRef.current.getBoundingClientRect().height;
        if (Number.isFinite(nextHeight) && nextHeight > 0) {
            setCardHeight(Math.round(nextHeight));
        }
    }, [activeIndex, isActive, targetState.rect, currentStep?.id]);

    useEffect(() => {
        if (!isActive) {
            return undefined;
        }

        if (activeIndex < steps.length) {
            return undefined;
        }

        const timerId = window.setTimeout(() => {
            finishTour();
        }, 0);

        return () => {
            window.clearTimeout(timerId);
        };
    }, [activeIndex, finishTour, isActive, steps.length]);

    const spotlightRect = useMemo(() => {
        if (!targetState.rect || !isRectInViewport(targetState.rect)) {
            return null;
        }

        return {
            top: `${Math.max(targetState.rect.top - SPOTLIGHT_PADDING, CARD_MARGIN)}px`,
            left: `${Math.max(targetState.rect.left - SPOTLIGHT_PADDING, CARD_MARGIN)}px`,
            width: `${targetState.rect.width + (SPOTLIGHT_PADDING * 2)}px`,
            height: `${targetState.rect.height + (SPOTLIGHT_PADDING * 2)}px`
        };
    }, [targetState.rect]);

    const cardPosition = useMemo(() => (
        resolveCardPosition(targetState.rect, currentStep?.placement || 'bottom', cardHeight)
    ), [cardHeight, currentStep?.placement, targetState.rect]);

    const contextValue = useMemo(() => ({
        startTour,
        isTourActive: isActive,
        onboardingVersion: ONBOARDING_VERSION,
        shouldShowGuideTrigger
    }), [isActive, shouldShowGuideTrigger, startTour]);

    const shouldRenderWelcome = isActive && currentStep?.type === 'welcome';
    const shouldRenderStepCard = isActive && currentStep && currentStep.type !== 'welcome';
    const canGoBack = activeIndex > sessionStartIndex;
    const isLastStep = activeIndex >= steps.length - 1;

    return (
        <OnboardingContext.Provider value={contextValue}>
            {children}

            {shouldRenderWelcome ? (
                <ModalShell
                    isOpen={true}
                    onClose={skipTour}
                    title={currentStep.title}
                    subtitle={currentStep.description}
                    shellClassName="modal-shell--onboarding"
                    labelledBy="onboarding-welcome-title"
                    describedBy="onboarding-welcome-description"
                    footer={(
                        <>
                            <button type="button" className="btn btn-secondary onboarding-welcome__skip" onClick={skipTour}>
                                Ahora no
                            </button>
                            <button type="button" className="btn btn-primary onboarding-welcome__start" onClick={goToNextStep}>
                                Iniciar recorrido
                            </button>
                        </>
                    )}
                >
                    <div className="onboarding-welcome">
                        <p className="onboarding-welcome__eyebrow">Recorrido guiado de primer uso</p>
                        <div className="onboarding-welcome__meter" aria-hidden="true">
                            <span className={`onboarding-welcome__meter-fill onboarding-welcome__meter-fill--${welcomeProgressBucket}`.trim()} />
                        </div>
                        <p className="onboarding-welcome__progress">
                            Progreso: {completedStepCount} de {actionableSteps.length} módulos
                        </p>
                        <div className="onboarding-welcome__chips" aria-label="Resumen de la guía">
                            <span className="onboarding-welcome__chip">Módulos por rol</span>
                            <span className="onboarding-welcome__chip">Flujo de cotización</span>
                            <span className="onboarding-welcome__chip">Accesos clave</span>
                        </div>
                        <p className="onboarding-welcome__note">
                            Duración estimada: 1 a 2 minutos.
                        </p>
                    </div>
                </ModalShell>
            ) : null}

            {shouldRenderStepCard ? (
                <div className="onboarding-layer" aria-live="polite">
                    <button
                        type="button"
                        className={`onboarding-layer__scrim ${currentStep.allowInteraction ? 'onboarding-layer__scrim--interactive' : ''}`.trim()}
                        aria-label="Overlay de onboarding activo"
                        tabIndex={-1}
                    />

                    {spotlightRect ? (
                        // eslint-disable-next-line no-restricted-syntax
                        <div className="onboarding-layer__spotlight" style={spotlightRect} aria-hidden="true" />
                    ) : null}

                    <section
                        ref={cardRef}
                        className={`card onboarding-card ${cardPosition.mode === 'center' ? 'onboarding-card--center' : ''}`.trim()}
                        // eslint-disable-next-line no-restricted-syntax
                        style={cardPosition.style}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="onboarding-step-title"
                        aria-describedby="onboarding-step-description"
                    >
                        <div className="onboarding-card__meta">
                            <p className="onboarding-card__counter">
                                Paso {Math.max(currentActionableIndex + 1, 1)} de {actionableSteps.length}
                            </p>
                            <button type="button" className="onboarding-card__link-action" onClick={skipTour}>
                                Salir de la guía
                            </button>
                        </div>
                        <h2 id="onboarding-step-title" className="onboarding-card__title">{currentStep.title}</h2>
                        <p id="onboarding-step-description" className="onboarding-card__description">{currentStep.description}</p>

                        {currentStep.allowInteraction ? (
                            <p className="onboarding-card__hint">
                                En este paso puedes interactuar directamente con la pantalla.
                            </p>
                        ) : null}

                        {targetState.source === 'none' ? (
                            <p className="onboarding-card__hint">
                                Este elemento no está visible en tu pantalla actual. Puedes continuar.
                            </p>
                        ) : null}
                        <div className="onboarding-card__actions">
                            <div className={`onboarding-card__actions-main ${canGoBack ? '' : 'onboarding-card__actions-main--single'}`.trim()}>
                                {canGoBack ? (
                                    <button type="button" className="btn btn-secondary" onClick={goToPreviousStep}>
                                        Atrás
                                    </button>
                                ) : null}
                                <button type="button" className="btn btn-primary" onClick={goToNextStep}>
                                    {isLastStep ? 'Finalizar' : 'Siguiente'}
                                </button>
                            </div>
                        </div>
                    </section>
                </div>
            ) : null}

            <ModalShell
                isOpen={Boolean(completionRedirectTo)}
                onClose={handleCompletionClose}
                title="Recorrido completado"
                subtitle="Ya conoces los módulos principales de LINHER Move."
                shellClassName="modal-shell--onboarding"
                labelledBy="onboarding-completion-title"
                describedBy="onboarding-completion-description"
                footer={(
                    <button type="button" className="btn btn-primary" onClick={handleCompletionClose}>
                        {completionRedirectTo === '/settings' ? 'Ir a Ajustes' : 'Ir al Dashboard'}
                    </button>
                )}
            >
                <div className="onboarding-welcome">
                    <p id="onboarding-completion-description" className="onboarding-welcome__note">
                        {completionRedirectTo === '/settings'
                            ? 'Ahora te llevaremos a Ajustes para continuar con la configuración inicial.'
                            : 'No tienes acceso a Ajustes. Te llevaremos al Dashboard para continuar.'}
                    </p>
                </div>
            </ModalShell>
        </OnboardingContext.Provider>
    );
};

export const useOnboarding = () => {
    const context = useContext(OnboardingContext);
    if (!context) {
        throw new Error('useOnboarding must be used within an OnboardingProvider');
    }

    return context;
};

