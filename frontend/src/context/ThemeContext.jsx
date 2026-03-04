/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'theme_preference';
const ThemeContext = createContext(null);

const getInitialTheme = () => {
    const storedTheme = localStorage.getItem(STORAGE_KEY);
    if (storedTheme === 'dark' || storedTheme === 'light') {
        return storedTheme;
    }

    return 'dark';
};

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(getInitialTheme);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(STORAGE_KEY, theme);

        const themeColor = theme === 'light' ? '#e3e8ee' : '#0f1013';
        let themeColorMeta = document.querySelector('meta[name="theme-color"]');

        if (!themeColorMeta) {
            themeColorMeta = document.createElement('meta');
            themeColorMeta.setAttribute('name', 'theme-color');
            document.head.appendChild(themeColorMeta);
        }

        themeColorMeta.setAttribute('content', themeColor);
    }, [theme]);

    const value = useMemo(() => ({
        theme,
        setTheme,
        toggleTheme: () => setTheme((currentTheme) => currentTheme === 'dark' ? 'light' : 'dark')
    }), [theme]);

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }

    return context;
};
