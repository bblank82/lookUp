# lookUP! Todo

## 🚀 Production (Amplify)

- [ ] **Amplify Functions: OpenSky proxy**
  - Create `amplify/functions/opensky-proxy/` Lambda
  - Accepts `?icao24=xxx`, does OAuth2 token exchange + `/flights/aircraft` call server-side
  - Move `credentials.json` to Amplify environment variables (`OPENSKY_CLIENT_ID`, `OPENSKY_CLIENT_SECRET`)
  - Update `utils/opensky.js` to call `/api/opensky-proxy?icao24=xxx` (works locally via Vite proxy too)
  - Migrate RapidAPI key from `utils/api.js` to Amplify env var (`VITE_RAPIDAPI_KEY`)
  
  **Draft Node.js Lambda Handler (`amplify/functions/opensky-proxy/handler.mjs`):**
  ```javascript
  export const handler = async (event) => {
      const clientId = process.env.OPENSKY_CLIENT_ID;
      const clientSecret = process.env.OPENSKY_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
          return { statusCode: 500, body: 'Missing OpenSky credentials in environment.' };
      }

      try {
          // 1. Fetch short-lived OAuth token
          const tokenUrl = 'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token';
          const tokenResp = await fetch(tokenUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                  grant_type: 'client_credentials',
                  client_id: clientId,
                  client_secret: clientSecret
              })
          });

          if (!tokenResp.ok) throw new Error('Token fetch failed');
          const { access_token } = await tokenResp.json();

          // 2. Extract path & query string to pass to OpenSky
          //    e.g., event.pathParameters.proxy = "flights/aircraft"
          const targetPath = event.pathParameters?.proxy || '';
          let targetUrl = \`https://opensky-network.org/api/\${targetPath}\`;
          
          if (event.queryStringParameters) {
              targetUrl += '?' + new URLSearchParams(event.queryStringParameters).toString();
          }

          // 3. Make the API request
          const apiResp = await fetch(targetUrl, {
              headers: { Authorization: \`Bearer \${access_token}\` }
          });
          
          const data = await apiResp.text();

          // 4. Return to client with CORS headers
          return {
              statusCode: apiResp.status,
              headers: {
                  "Access-Control-Allow-Origin": "*",
                  "Access-Control-Allow-Headers": "*",
                  "Content-Type": "application/json"
              },
              body: data
          };
      } catch (err) {
          console.error('[OpenSky Proxy Error]:', err);
          return {
              statusCode: 500,
              headers: { "Access-Control-Allow-Origin": "*" },
              body: JSON.stringify({ error: err.message })
          };
      }
  };
  ```

## ✨ Features

- [ ] Airport code enrichment — strip ICAO prefixes for non-US airports (EGLL → LHR etc.) using a local airport DB
- [ ] Flight arrival time estimate on card (use `lastSeen` from OpenSky)
- [ ] Mobile prototype polish — swipe gestures on bottom sheet
- [ ] Trail rendering: ensure trail layer renders below aircraft marker

## 🐛 Known Issues

- OpenSky dep/arr returns `null` for in-progress flights until the aircraft is near an airport
- `credentials.json` is committed to the repo — remove before making repo public
