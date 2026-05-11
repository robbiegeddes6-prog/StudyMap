# Welcome to your Lovable project

## Development Setup

### Mock API for Development
When Supabase is not available, the app automatically uses a mock API for development:

1. Set `VITE_USE_MOCK_API=true` in your `.env` file
2. The app will use localStorage for data persistence
3. Authentication works with any email/password combination
4. Check browser console for "🔧 Mock API" logs

### Production Setup
For production, ensure your Supabase credentials are properly configured and remove `VITE_USE_MOCK_API=true` from `.env`.

## Running the Project

### Development Server
```bash
npm install
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production
```bash
npm run build
npm run preview
```
