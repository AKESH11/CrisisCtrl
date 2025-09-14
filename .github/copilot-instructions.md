# CrisisCtrl - AI Development Guide

## Architecture Overview

This is a **real-time disaster alert management system** built with React + Vite frontend and Supabase backend. The core workflow centers around admins creating disaster alerts that instantly appear on an interactive map for all connected users.

**Key Components:**
- `src/App.jsx` - Router with session-based auth protection
- `src/pages/Dashboard.jsx` - Main dashboard with real-time subscriptions
- `src/components/MapComponent.jsx` - Leaflet map with custom markers
- `src/components/AlertsSidebar.jsx` - Alert management with admin controls
- `src/lib/supabaseClient.js` - Centralized Supabase client and auth helpers

## Critical Architecture Patterns

### Authentication & Authorization
- **Magic Link Auth**: Uses Supabase Auth with passwordless email links
- **Role-based Access**: Admin role stored in `user_metadata.role = 'admin'`
- **Helper Function**: Use `isAdmin(user)` from `supabaseClient.js` for role checks
- **Session Management**: Session state in `App.jsx` drives route protection

### Real-time Data Flow
```javascript
// Real-time subscription pattern used in Dashboard.jsx
const channel = supabase
  .channel('alerts-changes')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, 
    (payload) => setAlerts(prev => [payload.new, ...prev]))
```

### Database Schema Conventions
- **Tables**: `alerts` and `resources` with RLS enabled
- **Alert Severity**: Enum values `'Low', 'Medium', 'High'` (exact case)
- **Coordinates**: `DECIMAL(10, 8)` for latitude, `DECIMAL(11, 8)` for longitude
- **UUIDs**: All primary keys use `gen_random_uuid()`

### Map Implementation
- **Leaflet + React-Leaflet**: Map centered on NYC coordinates by default
- **Custom Icons**: Red markers for alerts, blue for resources from GitHub CDN
- **Icon Fix**: Always include the Leaflet icon fix pattern in MapComponent.jsx

## Development Workflows

### Environment Setup
```bash
npm install
cp .env.example .env.local  # Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev  # Runs on localhost:3000
```

### Database Setup
1. Run `supabase-schema-fixed.sql` in Supabase SQL Editor
2. Manually set admin role: Update user metadata with `{"role": "admin"}`

### Testing Real-time Features
- Open app in multiple browser windows
- Create alert in one window, verify instant appearance in others
- Real-time works via Supabase channels, not WebSockets

## Code Conventions

### State Management
- Use `useState` for local component state
- Lift shared state to `Dashboard.jsx` (alerts, resources)
- Pass data down via props, callbacks up for updates

### Error Handling
```javascript
// Standard pattern throughout codebase
try {
  const { data, error } = await supabase.from('table').select()
  if (error) throw error
  // Handle success
} catch (err) {
  console.error('Error:', err)
  setError('User-friendly message')
}
```

### Styling Patterns
- **Tailwind CSS**: Utility-first with custom emergency colors
- **Severity Colors**: `bg-red-100 text-red-800` (high), `bg-orange-100 text-orange-800` (medium), `bg-yellow-100 text-yellow-800` (low)
- **Loading States**: Spinner component pattern in App.jsx

### Form Validation
- Client-side validation in `CreateAlertModal.jsx` for coordinates (-90 to 90 lat, -180 to 180 lng)
- Required fields: description, severity, latitude, longitude
- Always parse coordinate strings to floats and validate

## Integration Points

### Supabase Configuration
- **Row Level Security**: Enabled on all tables
- **Policies**: Authenticated users can read, role-based writes handled in app layer
- **Environment**: Use `import.meta.env` for Vite environment variables

### External Dependencies
- **Leaflet Icons**: CDN-hosted markers from GitHub (pointhi/leaflet-color-markers)
- **Tile Layer**: OpenStreetMap tiles (no API key required)

## Common Tasks

### Adding New Alert Types
1. Update SQL schema `severity` CHECK constraint
2. Update severity badge classes in both `AlertsSidebar.jsx` and `MapComponent.jsx`
3. Add new color to `tailwind.config.js` emergency palette

### Extending Real-time Features
- Subscribe to additional events: `UPDATE`, `DELETE` in Dashboard.jsx
- Use consistent channel naming: `table-changes`
- Always handle payload.new for INSERT/UPDATE events

### Map Customization
- Default center: NYC coordinates `[40.7589, -73.9851]`
- Zoom level: 12 for city-level view
- Custom icons: Use L.Icon constructor with GitHub CDN URLs