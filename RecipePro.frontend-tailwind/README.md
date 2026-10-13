# RecipePro Frontend

Expo Router + React Native + NativeWind (Tailwind CSS) frontend for the supplied RecipePro .NET API.

## Backend endpoints wired

- GET/POST/PUT `/api/categories` (plus GET by id)
- GET/POST/PUT/DELETE `/api/ingredients`
- GET/POST/PUT/DELETE `/api/recipes`
- POST `/api/recipes/{id}/calculate`

These paths are centralized in `src/api/endpoints.ts`; screens never contain backend URLs. Request/response types mirror the supplied C# DTOs.

## Setup

1. Install Node.js compatible with your Expo environment.
2. Run `npm install`.
3. Copy `.env.example` to `.env`.
4. Set `EXPO_PUBLIC_API_BASE_URL`. The supplied backend launch profile uses `http://localhost:5204`, so the default is:

   `EXPO_PUBLIC_API_BASE_URL=http://localhost:5204/api`

5. Start the app with `npm start`.

### Device URLs

- iOS simulator / web: `http://localhost:5204/api`
- Android emulator: `http://10.0.2.2:5204/api`
- Physical phone: use your PC LAN IP, for example `http://192.168.1.10:5204/api`.

For Expo web, the supplied backend currently allows `http://localhost:8081`. Keep Expo web on port 8081 unless you also update backend CORS.

## Important

The backend currently has no authentication controller, so this frontend does not invent login/auth endpoints.

The backend also does not expose category DELETE; the admin category UI therefore supports create and update only.

## Tailwind

NativeWind is configured through `tailwind.config.js`, `babel.config.js`, `metro.config.js`, and `src/global.css`.
