import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ThemeColor = 'emerald' | 'blue' | 'violet' | 'rose' | 'amber' | 'cyan';

interface ThemeColorConfig {
  name: string;
  primary: string;
  hover: string;
  light: string;
  ring: string;
  text: string;
  bg: string;
  hex: string;
}

export const THEME_COLORS: Record<ThemeColor, ThemeColorConfig> = {
  emerald: {
    name: 'Emerald',
    primary: 'bg-emerald-600',
    hover: 'hover:bg-emerald-700',
    light: 'bg-emerald-100 dark:bg-emerald-900/30',
    ring: 'ring-emerald-500 focus:ring-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500',
    hex: '#10b981',
  },
  blue: {
    name: 'Blue',
    primary: 'bg-blue-600',
    hover: 'hover:bg-blue-700',
    light: 'bg-blue-100 dark:bg-blue-900/30',
    ring: 'ring-blue-500 focus:ring-blue-500',
    text: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-500',
    hex: '#3b82f6',
  },
  violet: {
    name: 'Violet',
    primary: 'bg-violet-600',
    hover: 'hover:bg-violet-700',
    light: 'bg-violet-100 dark:bg-violet-900/30',
    ring: 'ring-violet-500 focus:ring-violet-500',
    text: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-500',
    hex: '#8b5cf6',
  },
  rose: {
    name: 'Rose',
    primary: 'bg-rose-600',
    hover: 'hover:bg-rose-700',
    light: 'bg-rose-100 dark:bg-rose-900/30',
    ring: 'ring-rose-500 focus:ring-rose-500',
    text: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-500',
    hex: '#f43f5e',
  },
  amber: {
    name: 'Amber',
    primary: 'bg-amber-600',
    hover: 'hover:bg-amber-700',
    light: 'bg-amber-100 dark:bg-amber-900/30',
    ring: 'ring-amber-500 focus:ring-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500',
    hex: '#f59e0b',
  },
  cyan: {
    name: 'Cyan',
    primary: 'bg-cyan-600',
    hover: 'hover:bg-cyan-700',
    light: 'bg-cyan-100 dark:bg-cyan-900/30',
    ring: 'ring-cyan-500 focus:ring-cyan-500',
    text: 'text-cyan-600 dark:text-cyan-400',
    bg: 'bg-cyan-500',
    hex: '#06b6d4',
  },
};

interface ThemeContextType {
  themeColor: ThemeColor;
  setThemeColor: (color: ThemeColor) => void;
  theme: ThemeColorConfig;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [themeColor, setThemeColorState] = useState<ThemeColor>(() => {
    const saved = localStorage.getItem('themeColor');
    return (saved as ThemeColor) || 'emerald';
  });

  const [darkMode, setDarkModeState] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('themeColor', themeColor);
  }, [themeColor]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  const setThemeColor = (color: ThemeColor) => {
    setThemeColorState(color);
  };

  const setDarkMode = (dark: boolean) => {
    setDarkModeState(dark);
  };

  const toggleDarkMode = () => {
    setDarkModeState(!darkMode);
  };

  return (
    <ThemeContext.Provider
      value={{
        themeColor,
        setThemeColor,
        theme: THEME_COLORS[themeColor],
        darkMode,
        setDarkMode,
        toggleDarkMode,
      }}
    >
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
