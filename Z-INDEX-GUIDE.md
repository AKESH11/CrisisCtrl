# Z-Index Layer Management

This document outlines the z-index hierarchy used in the CrisisCtrl application to ensure proper layering of UI elements.

## Z-Index Hierarchy (Low to High)

### Base Layer (Default)
- `z-index: auto` - Normal document flow
- Map container and basic UI elements

### Map Elements
- `z-[1000]` - Map legends, indicators, and overlays
- Used in: MapComponent legend, real-time indicator, instructions

### Floating UI Elements
- `z-[10000]` - Floating buttons and non-modal overlays
- Used in: Volunteer chat button, accessibility button
- Should appear above map but below panels/modals

### Panels and Sidebars
- `z-[100000]` - Chat panels, sidebars, dropdowns
- Used in: ChatPanel, context menus
- Interactive panels that should appear above floating buttons

### Modal Overlays
- `z-[999999]` - Modal backgrounds and lower-priority modals
- Used in: General modal overlays

### High-Priority Modals
- `z-[1000000]` - Critical modals and accessibility panels
- Used in: AccessibilityPanel, AlertRegistrationForm, NearbyResourcesPanel
- Should appear above everything else

## Usage Guidelines

1. **Map Elements**: Use `z-[1000]` for elements that should appear on the map
2. **Floating Buttons**: Use `z-[10000]` for floating action buttons
3. **Interactive Panels**: Use `z-[100000]` for chat, dropdown, and interactive panels
4. **Modals**: Use `z-[999999]` for standard modals
5. **Critical UI**: Use `z-[1000000]` for accessibility and emergency interfaces

## Recent Fixes

- **Volunteer Chat Button**: Added `z-[10000]` to ensure it appears above the map
- **Chat Panel**: Uses `z-[100000]` to appear above the chat button
- **Accessibility Panel**: Uses `z-[1000000]` for highest priority access

## Testing Layering

When adding new floating or overlay elements:
1. Test with map interaction
2. Test with chat button visibility
3. Test with modal interactions
4. Ensure accessibility panel always accessible

## Common Issues

- **Behind Map**: Add appropriate z-index (minimum `z-[10000]`)
- **Button Conflicts**: Ensure lower priority buttons use lower z-index
- **Modal Issues**: Check if competing modals need priority adjustment