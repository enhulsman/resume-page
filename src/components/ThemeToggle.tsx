import { useState, useEffect } from 'react';
import { type ThemeName, themes, getStoredTheme, setStoredTheme, applyTheme, initializeTheme } from '../lib/theme';

export default function ThemeToggle() {
  const [currentTheme, setCurrentTheme] = useState<ThemeName>('light');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const theme = initializeTheme();
    setCurrentTheme(theme);
  }, []);

  const handleThemeChange = (theme: ThemeName) => {
    setCurrentTheme(theme);
    setStoredTheme(theme);
    applyTheme(theme);
    setIsOpen(false);
  };

  const currentThemeConfig = themes.find(t => t.name === currentTheme) || themes[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-theme-secondary hover:text-theme-primary bg-theme-elevated hover:bg-theme-secondary border border-theme-primary"
        aria-label="Toggle theme"
      >
        <span className="text-lg">{currentThemeConfig.icon}</span>
        <span className="text-sm font-medium hidden sm:inline">
          {currentThemeConfig.displayName}
        </span>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 py-2 w-48 bg-theme-elevated border border-theme-primary rounded-lg shadow-lg z-20">
            {themes.map((theme) => (
              <button
                key={theme.name}
                onClick={() => handleThemeChange(theme.name)}
                className={`w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-theme-secondary transition-colors duration-150 ${
                  currentTheme === theme.name 
                    ? 'text-theme-accent bg-theme-secondary' 
                    : 'text-theme-secondary hover:text-theme-primary'
                }`}
              >
                <span className="text-lg">{theme.icon}</span>
                <span className="text-sm font-medium">{theme.displayName}</span>
                {currentTheme === theme.name && (
                  <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
