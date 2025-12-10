# Authentication (Supabase)

This backend delegates user authentication to Supabase Auth. The Go API verifies Supabase-issued JWTs and uses the JWT subject (`sub`) as the primary key for `users.id`.

## Signup / Login

- Frontend uses `@supabase/supabase-js` (or direct HTTP requests to GoTrue) to sign up and sign in users.
- Supported flows: email/password, OAuth (Google, etc.), magic links, password reset.
- After a successful login, the client receives:
  - `access_token`: JWT used in `Authorization: Bearer <token>` for API calls
  - `refresh_token`: used by supabase-js to refresh the access token

## Token Verification in API

- API expects `Authorization: Bearer <access_token>`.
- Uses `SUPABASE_JWT_SECRET` to verify the token (HS256 default).
- Enforces audience and optional issuer checks.
- The `sub` claim is treated as the UUID for `users.id`.
- On first request, the API attempts to provision a `users` row (via middleware), and `/me/bootstrap` can explicitly create it with email/name.

## JWT Structure (typical)

- Standard claims: `iss`, `aud`, `exp`, `iat`, `sub` (UUID string), optional `email`.
- Validation in the API:
  - Signature using HS256 and SUPABASE_JWT_SECRET
  - `aud = authenticated` (default, configurable)
  - Optional `iss = https://<project>.supabase.co/auth/v1`

## Token Refresh

- Managed by supabase-js on the frontend.
- The API does not refresh tokens; it only validates presented access tokens.
- If a token is expired, the API returns 401 Unauthorized; frontend should refresh and retry.

## Security Notes

- Never expose the Supabase service role key to the frontend.
- Keep `SUPABASE_JWT_SECRET` only on the server.
- Use HTTPS in production.
- Consider rate limiting sensitive endpoints (invite accept, etc.).

