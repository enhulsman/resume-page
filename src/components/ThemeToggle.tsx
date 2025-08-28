import { useState, useEffect } from 'react';
import { type ThemeName, themes, getStoredTheme, setStoredTheme, applyTheme, initializeTheme } from '../lib/theme';

export default function ThemeToggle() {
  const [currentTheme, setCurrentTheme] = useState<ThemeName>('light');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const theme = initializeTheme();
    setCurrentTheme(theme);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      // Check if click is outside the dropdown container
      if (!target.closest('[data-theme-dropdown]')) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleThemeChange = (theme: ThemeName) => {
    setCurrentTheme(theme);
    setStoredTheme(theme);
    applyTheme(theme);
    setIsOpen(false);
  };

  const currentThemeConfig = themes.find(t => t.name === currentTheme) || themes[0];

  return (
    <div className="relative" data-theme-dropdown>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-md transition-all duration-200 text-theme-secondary hover:text-theme-primary bg-theme-elevated hover:bg-theme-secondary text-xs sm:text-sm font-medium shadow-theme-sm border-0"
        aria-label="Toggle theme"
      >
        <span className="text-sm sm:text-base">{currentThemeConfig.icon}</span>
        <span className="hidden sm:inline">
          {currentThemeConfig.displayName}
        </span>
        <svg
          className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
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
          <div className="absolute right-0 mt-1 py-1 w-36 sm:w-40 bg-theme-elevated border border-theme-primary rounded-md shadow-theme-lg z-20">
            {themes.map((theme) => (
              <button
                key={theme.name}
                onClick={() => handleThemeChange(theme.name)}
                className={`w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-theme-secondary transition-colors duration-150 text-xs sm:text-sm font-medium ${
                  currentTheme === theme.name 
                    ? 'text-theme-accent bg-theme-secondary' 
                    : 'text-theme-secondary hover:text-theme-primary'
                }`}
              >
                <span className="text-sm sm:text-base">{theme.icon}</span>
                <span>{theme.displayName}</span>
                {currentTheme === theme.name && (
                  <svg className="w-3 h-3 ml-auto" fill="currentColor" viewBox="0 0 20 20">
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
