// API Configuration
const getApiBaseUrl = () => {
    // Use environment variable for server URL
    const serverUrl = import.meta.env.VITE_SERVER_URL;
    return `${serverUrl}/api`;
};

export const API_BASE_URL = getApiBaseUrl();
export const SERVER_URL = import.meta.env.VITE_SERVER_URL;

export const API_ENDPOINTS = {
    AUTH: {
        LOGIN: `${API_BASE_URL}/auth/login`,
        SIGNUP: `${API_BASE_URL}/auth/signup`,
        LOGOUT: `${API_BASE_URL}/auth/logout`,
        ME: `${API_BASE_URL}/auth/me`,
        UPDATE_PROFILE: `${API_BASE_URL}/auth/profile`,
        UPDATE_PASSWORD: `${API_BASE_URL}/auth/password`,
    },
    ATTENDANCE: {
        MARK: `${API_BASE_URL}/attendance/mark`,
        HISTORY: `${API_BASE_URL}/attendance/history`,
        TODAY: `${API_BASE_URL}/attendance/today`,
        STATS: `${API_BASE_URL}/attendance/stats`,
        BREAK: `${API_BASE_URL}/attendance/break`,
        CURRENT_BREAK: `${API_BASE_URL}/attendance/current-break`,
        DETAILED: `${API_BASE_URL}/attendance/detailed`,
    },
    EMPLOYEES: `${API_BASE_URL}/employees`,
} as const;
