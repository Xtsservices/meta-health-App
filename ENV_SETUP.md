# Environment Variables Setup

This project uses `react-native-dotenv` to manage environment variables securely.

## Setup Instructions

1. **Create `.env` file** in the root directory (already created)
2. **Add your API keys** to the `.env` file:

```env
GOOGLE_MAPS_API_KEY=your_actual_google_maps_api_key_here
API_BASE_URL=https://your-api-domain.com
```

3. **Important**: Never commit the `.env` file to version control!
   - The `.env` file should be added to `.gitignore`
   - Use `.env.example` as a template for team members

## How It Works

- Environment variables are loaded from `.env` file
- Variables are imported using: `import { GOOGLE_MAPS_API_KEY } from '@env'`
- Type definitions are in `src/types/env.d.ts`

## After Changing .env

If you modify the `.env` file:

1. **Clear Metro bundler cache:**
   ```bash
   npm start -- --reset-cache
   ```

2. **Rebuild the app:**
   ```bash
   # For Android
   npm run android
   
   # For iOS
   npm run ios
   ```

## Current Usage

The `GOOGLE_MAPS_API_KEY` is used in:
- `src/utils/locationUtils.ts` - Distance Matrix API
- `src/utils/directionsUtils.ts` - Directions API (update this file too)
- Android/iOS native maps configuration

## Security Notes

✅ **DO:**
- Keep `.env` file local only
- Use different keys for development and production
- Restrict API key usage in Google Cloud Console

❌ **DON'T:**
- Commit `.env` to Git
- Share API keys publicly
- Use production keys in development

## Troubleshooting

**Error: "Cannot find module '@env'"**
- Run: `npm start -- --reset-cache`
- Rebuild the app

**Error: "GOOGLE_MAPS_API_KEY is undefined"**
- Check `.env` file exists in root directory
- Verify the variable name matches exactly
- Restart Metro bundler with cache reset
