# Dark Mode Implementation Guide

## Overview
CrisisCtrl now includes a comprehensive dark mode feature as part of its accessibility system. Dark mode reduces eye strain in low-light conditions and provides an alternative visual experience for users.

## Features
- **Toggle Control**: Dark mode can be toggled via the Accessibility Panel
- **Keyboard Shortcut**: Press `Alt+D` for quick dark mode toggle
- **Persistence**: User preference is saved in localStorage
- **Auto-initialization**: Dark mode state is restored on page load
- **Map Integration**: Map tiles automatically switch to dark theme
- **Comprehensive Styling**: All UI components support dark mode

## Implementation Details

### CSS Classes
Dark mode uses the `dark` class on the `html` element to trigger dark styles:

```css
/* Light mode (default) */
.bg-white { background-color: white; }

/* Dark mode */
.dark .bg-white { background-color: #1f2937; }
```

### Component Integration

#### AccessibilityPanel.jsx
- Contains the dark mode toggle control
- Manages dark mode state and localStorage persistence
- Applies `dark` class to document root

#### Dashboard.jsx
- Implements `Alt+D` keyboard shortcut
- Initializes dark mode on page load
- Documents keyboard shortcuts

#### MapComponent.jsx
- Detects dark mode via DOM class observation
- Switches tile layers for dark theme:
  - Light: OpenStreetMap standard tiles
  - Dark: CartoDB dark theme tiles

### Styling Coverage
Dark mode styling includes:
- **Backgrounds**: Page, cards, panels, modals
- **Text**: Primary, secondary, muted text colors
- **Forms**: Inputs, textareas, select elements
- **Buttons**: Primary, secondary, danger states
- **Interactive**: Hover, focus, active states
- **Shadows**: Adjusted for dark backgrounds
- **Borders**: Subtle borders for dark theme

### Usage

#### Via Accessibility Panel
1. Click the accessibility icon (👁️) in the top-right
2. Navigate to "Visual Assistance" section
3. Toggle "Dark Mode" switch

#### Via Keyboard Shortcut
- Press `Alt+A` to open accessibility panel
- Press `Alt+D` for direct dark mode toggle

### Technical Details

#### localStorage Keys
- `accessibility-darkmode`: Stores boolean dark mode preference

#### CSS Custom Properties
The implementation uses Tailwind's built-in dark mode support with class strategy:

```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'class', // Enable class-based dark mode
  // ...
}
```

#### Map Tile Providers
- **Light Mode**: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
- **Dark Mode**: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`

## Accessibility Compliance
- Maintains WCAG contrast ratios in dark mode
- Keyboard navigation fully supported
- Screen reader compatibility preserved
- Works with other accessibility features (zoom, high contrast)

## Browser Support
- Modern browsers with CSS custom properties support
- localStorage support required for persistence
- MutationObserver API for map integration

## Future Enhancements
- System preference detection (`prefers-color-scheme`)
- Additional dark tile layer options
- Component-specific dark mode overrides
- Dark mode animations/transitions