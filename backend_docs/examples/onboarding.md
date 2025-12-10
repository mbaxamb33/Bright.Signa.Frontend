# Onboarding (curl walkthrough)

## Prerequisites

- Supabase project with Auth enabled; have a user with a JWT access token.
- API running locally: `make server-supabase`.

## 1) Bootstrap user

```
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User"}' \
  http://localhost:8080/me/bootstrap
```

## 2) Create shop (owner)

```
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"My Shop","timezone":"Europe/Bucharest"}' \
  http://localhost:8080/api/v1/shops
```

Capture `shop_id` from the response.

## 3) Invite teammate

```
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"invited_email":"invitee@example.com","role":"sales_junior"}' \
  http://localhost:8080/api/v1/shops/$SHOP_ID/invitations
```

## 4) Accept invitation (as invitee)

The invitee signs in and obtains their `$INVITEE_TOKEN`, then:

```
curl -s -X POST \
  -H "Authorization: Bearer $INVITEE_TOKEN" \
  http://localhost:8080/api/v1/invitations/$INVITE_TOKEN/accept
```

