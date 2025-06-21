import React, { createContext, useContext, useState, useEffect } from 'react';

interface ThemeContextType {
    darkMode: boolean;
    toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [darkMode, setDarkMode] = useState(false);

    // Load theme preference from localStorage on mount
    useEffect(() => {
        const savedTheme = localStorage.getItem('dark-mode');
        if (savedTheme) {
            const isDark = savedTheme === 'true';
            setDarkMode(isDark);
            updateDocumentTheme(isDark);
        }
    }, []);

    const updateDocumentTheme = (isDark: boolean) => {
        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    const toggleDarkMode = () => {
        const newDarkMode = !darkMode;
        setDarkMode(newDarkMode);
        localStorage.setItem('dark-mode', newDarkMode.toString());
        updateDocumentTheme(newDarkMode);
    };

    const value = {
        darkMode,
        toggleDarkMode
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};
