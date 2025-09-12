'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useOnboardingStatus = useOnboardingStatus;
const react_1 = require("react");
const auth_1 = require("@/contexts/auth");
function useOnboardingStatus() {
    const [needsOnboarding, setNeedsOnboarding] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const { user } = (0, auth_1.useAuth)();
    (0, react_1.useEffect)(() => {
        const checkOnboardingStatus = async () => {
            if (!user?.token) {
                setLoading(false);
                return;
            }
            try {
                console.log('[ONBOARDING] Checking onboarding status for user:', user.token);
                const response = await fetch(`/api/onboarding/survey?userToken=${user.token}`);
                if (response.status === 404) {
                    // No survey found - user needs onboarding
                    console.log('[ONBOARDING] No survey found, user needs onboarding');
                    setNeedsOnboarding(true);
                }
                else if (response.ok) {
                    const data = await response.json();
                    // Check if survey is completed
                    const completed = data.survey?.survey_completed || false;
                    console.log('[ONBOARDING] Survey found, completed:', completed);
                    setNeedsOnboarding(!completed);
                }
                else if (response.status === 503) {
                    // Service unavailable - onboarding system not configured
                    console.warn('[ONBOARDING] Onboarding system not configured, skipping');
                    setNeedsOnboarding(false); // Skip onboarding if system not ready
                }
                else {
                    console.error('[ONBOARDING] Error checking status:', response.status);
                    // Default to showing onboarding on error (safer)
                    setNeedsOnboarding(true);
                }
            }
            catch (error) {
                console.error('[ONBOARDING] Error checking onboarding status:', error);
                // Default to showing onboarding on error (safer)
                setNeedsOnboarding(true);
            }
            finally {
                setLoading(false);
            }
        };
        checkOnboardingStatus();
    }, [user?.token]);
    const markOnboardingComplete = () => {
        setNeedsOnboarding(false);
    };
    return {
        needsOnboarding,
        loading,
        markOnboardingComplete
    };
}
