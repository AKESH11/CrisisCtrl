# CrisisCtrl

A real-time web dashboard for emergency response coordination, built with React, Supabase, and Leaflet maps. This application allows administrators to post disaster alerts that instantly appear on an interactive map for all connected users.

## Features

- **Real-time Alert System**: Administrators can create alerts that instantly appear for all users
- **Interactive Map**: View alerts and resources (hospitals, shelters, etc.) on a live map
- **Role-based Access**: Admin and responder user roles with different permissions
- **Magic Link Authentication**: Secure, passwordless authentication via Supabase
- **Responsive Design**: Works on desktop and mobile devices
- **Live Updates**: Real-time updates using Supabase subscriptions

## Tech Stack

- **Frontend**: React 18 with Vite
- **Backend & Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with magic links
- **Maps**: Leaflet with react-leaflet
- **Styling**: Tailwind CSS
- **Real-time**: Supabase Realtime subscriptions

## Quick Start Guide

### Part 1: Supabase Backend Setup

1. **Create a Supabase Account**
   - Go to [https://supabase.com](https://supabase.com)
   - Sign up and create a new project
   - Wait for the project to be ready (this may take a few minutes)

2. **Run the SQL Schema**
   - In your Supabase dashboard, go to **SQL Editor**
   - Copy the contents of `supabase-schema.sql` and paste it into the SQL editor
   - Click **Run** to execute the schema
   - This will create the `alerts` and `resources` tables with proper RLS policies

3. **Get Your API Keys**
   - Go to **Settings > API** in your Supabase dashboard
   - Copy your **Project URL** and **anon/public key**
   - You'll need these for the frontend setup

4. **Create an Admin User (Important!)**
   - After setting up the frontend and creating your first user account
   - Go to **Authentication > Users** in Supabase dashboard
   - Click on your user and edit **User Metadata**
   - Add: `{"role": "admin"}` to make yourself an admin

### Part 2: Frontend Project Setup

1. **Clone and Install Dependencies**
   ```bash
   cd disaster-response-platform
   npm install
   ```

2. **Configure Environment Variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

3. **Start the Development Server**
   ```bash
   npm run dev
   ```
   
   The app will open at `http://localhost:3000`

### Part 3: Using the Application

1. **First Login**
   - Open the app and enter your email address
   - Click "Send Magic Link"
   - Check your email and click the login link
   - You'll be redirected to the dashboard

2. **Make Yourself an Admin**
   - Go to your Supabase dashboard > Authentication > Users
   - Find your user and click to edit
   - In "User Metadata", add: `{"role": "admin"}`
   - Refresh the app - you should now see the "Create New Alert" button

3. **Create Your First Alert**
   - Click "Create New Alert" in the sidebar
   - Fill in the description, severity, and coordinates
   - Click "Use Current Location" for quick coordinate input
   - Submit the alert - it will appear on the map instantly

4. **Test Real-time Updates**
   - Open the app in a new browser window/tab
   - Create an alert in one window
   - Watch it appear instantly in the other window

## Project Structure

```
src/
├── components/
│   ├── MapComponent.jsx          # Interactive Leaflet map
│   ├── AlertsSidebar.jsx         # Sidebar showing active alerts
│   └── CreateAlertModal.jsx      # Modal for creating new alerts
├── pages/
│   ├── AuthPage.jsx              # Magic link authentication
│   └── Dashboard.jsx             # Main dashboard with map and sidebar
├── lib/
│   └── supabaseClient.js         # Supabase client configuration
├── App.jsx                       # Main app with routing and auth state
├── main.jsx                      # React app entry point
└── index.css                     # Tailwind CSS and custom styles
```

## Key Features Explained

### Real-time Updates
The app uses Supabase's real-time subscriptions to listen for new alerts. When an admin creates an alert, it instantly appears for all connected users without requiring a page refresh.

### Role-based Access
- **Admins**: Can create, edit, and delete alerts
- **Responders**: Can view alerts and resources, but cannot create them

### Magic Link Authentication
Users log in by entering their email address. Supabase sends a secure login link that logs them in automatically.

### Interactive Map
- Red markers show emergency alerts with severity levels
- Blue markers show static resources (hospitals, shelters)
- Click any marker to see details in a popup
- Map includes a legend and real-time update indicator

## Deployment

### Deploy to Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin your-github-repo-url
   git push -u origin main
   ```

2. **Deploy to Vercel**
   - Connect your GitHub repo to Vercel
   - Add environment variables in Vercel dashboard:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
   - Deploy!

3. **Update Supabase Authentication Settings**
   - In Supabase dashboard, go to **Authentication > URL Configuration**
   - Add your production domain to **Site URL** and **Redirect URLs**

## Troubleshooting

### Common Issues

1. **"Missing Supabase environment variables" Error**
   - Make sure `.env.local` exists and has the correct variable names
   - Restart the dev server after adding environment variables

2. **Can't Create Alerts**
   - Check that your user has admin role in Supabase dashboard
   - Make sure RLS policies are properly set up

3. **Map Not Loading**
   - Check browser console for errors
   - Ensure Leaflet CSS is loaded in `index.html`

4. **Real-time Updates Not Working**
   - Verify Supabase real-time is enabled for your project
   - Check browser network tab for WebSocket connections

### Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build locally
npm run lint         # Run ESLint
```

## Database Schema

### Alerts Table
- `id`: UUID primary key
- `description`: Text description of the alert
- `severity`: Enum ('Low', 'Medium', 'High')
- `latitude`: Decimal coordinate
- `longitude`: Decimal coordinate
- `is_active`: Boolean flag
- `created_by`: Reference to auth.users
- `created_at`: Timestamp

### Resources Table
- `id`: UUID primary key
- `name`: Resource name
- `type`: Resource type (Hospital, Shelter, etc.)
- `latitude`: Decimal coordinate
- `longitude`: Decimal coordinate
- `is_active`: Boolean flag
- `created_at`: Timestamp

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review Supabase documentation
3. Open an issue on GitHub

---

Built with ❤️ for emergency response coordination.