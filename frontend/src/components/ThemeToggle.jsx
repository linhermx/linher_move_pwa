import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle = ({ variant = 'default' }) => {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';
    const toggleClassName = `theme-toggle${variant === 'menu' ? ' theme-toggle--menu' : ''}`;

    return (
        <button
            type="button"
            className={toggleClassName}
            onClick={toggleTheme}
            data-theme={theme}
            aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
            <span>
                {isDark ? <Moon size={16} /> : <Sun size={16} />}
            </span>
            <span className="theme-toggle__content">
                <span className="theme-toggle__eyebrow">Apariencia</span>
                <span className="theme-toggle__label">{isDark ? 'Modo oscuro' : 'Modo claro'}</span>
            </span>
            <span className="theme-toggle__switch" aria-hidden="true">
                <span className="theme-toggle__thumb" />
            </span>
        </button>
    );
};

export default ThemeToggle;
