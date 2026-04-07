# Integrate OpenSky Proxy via AWS Amplify Gen 2

Currently, the `lookUP!` front-end relies on a local Vite proxy to circumvent CORS restrictions when fetching the OAuth2 token and calling the OpenSky Network API. To deploy this to AWS Amplify, the local proxy needs to be replaced with a true backend resource—an AWS Lambda function—that handles all private interactions securely.

AWS Amplify Gen 2 is a "code-first" solution. By committing an `amplify/` folder to GitHub, Amplify Hosting automatically detects, builds, and provisions any defined cloud resources (like AWS Lambda) immediately alongside your frontend.

## Proposed Changes

### 1. Scaffold the Amplify Gen 2 Backend
We will use the official Amplify CLI tool to initialize the backend structure. This safely updates the project without breaking your standard Vanilla JavaScript Vite setup.

#### [NEW] `amplify/backend.ts`
The core backend configuration file. We will define the OpenSky proxy function here and attach an **AWS Lambda Function URL** to it. A Function URL provides a dedicated, direct HTTPS endpoint for the Lambda (bypassing the need for a complex API Gateway setup) and handles CORS responses natively.

### 2. Implement the Serverless Function
#### [NEW] `amplify/functions/opensky-proxy/resource.ts`
This configuration file informs Amplify about the function, referencing the `handler.ts` file, and binds it to two encrypted AWS secrets that you configure manually in your AWS console (`OPENSKY_CLIENT_ID` and `OPENSKY_CLIENT_SECRET`).

#### [NEW] `amplify/functions/opensky-proxy/handler.ts`
This will be the actual Lambda execution code. We will migrate the Javascript draft from our `todo.md` and convert it slightly to meet the AWS Lambda Request/Response format. It will grab the token securely and forward any query parameters to the appropriate OpenSky endpoints.

### 3. Update the Frontend to Call the Cloud Proxy
When the Amplify backend builds, it automatically generates a local `amplify_outputs.json` file containing your dynamic cloud endpoints.

#### [MODIFY] `utils/opensky.js`
We will rewrite the frontend method to query the new Lambda endpoint from `amplify_outputs.json` instead of the local Vite proxy.

## Open Questions

> [!IMPORTANT]  
> Are you ready to let me run `npm create amplify@latest -y` to auto-generate the `amplify/` directory and install the required Amplify sandbox modules into your `package.json`?

## Verification Plan
1. **Local Test Sandbox:** I'll run `npm run amplify sandbox` to spin up a local emulation of your AWS cloud stack. It streams logs back directly to the terminal.
2. **Frontend Wiring Test:** Open the browser and test fetching information on an airplane card.
3. **Commit:** Once it works, you push to GitHub, and AWS Amplify will detect the folder and automatically replicate this entire setup in the cloud.
