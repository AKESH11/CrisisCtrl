# Installation Commands for CrisisCtrl

Follow these exact commands to set up the project:

## 1. Create React Project with Vite
```bash
npm create vite@latest crisisctrl -- --template react
cd crisisctrl
```

## 2. Install Dependencies
```bash
npm install @supabase/supabase-js leaflet react-leaflet react-router-dom
```

## 3. Install Development Dependencies  
```bash
npm install -D tailwindcss postcss autoprefixer
```

## 4. Initialize Tailwind CSS
```bash
npx tailwindcss init -p
```

## 5. Start Development Server
```bash
npm run dev
```

## Note
If you're using the provided project files, you can skip steps 1-4 and just run:
```bash
npm install
npm run dev
```

## Environment Setup
Don't forget to:
1. Copy `.env.example` to `.env.local`
2. Add your Supabase URL and anon key
3. Run the SQL schema in Supabase dashboard