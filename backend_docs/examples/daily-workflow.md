# Daily Workflow (Sales Rep)

Assumes a sales rep has a membership in the shop and a JWT `$TOKEN`.

## 1) Submit daily achievements

```
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '[{"category_id":"revenue","occurred_on":"2025-12-05","achieved_value":"250.00"}]' \
  http://localhost:8080/api/v1/shops/$SHOP_ID/achievements
```

- Sales roles can only submit for themselves. Managers/owners can submit for someone else using `user_id`.

## 2) View my achievements over a range

```
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/v1/users/$USER_ID/achievements?start=2025-12-01&end=2025-12-31&limit=50&offset=0"
```

## 3) View leaderboard

```
# Manager/owner computes/refreshes snapshot
curl -s -X POST -H "Authorization: Bearer $MANAGER_TOKEN" \
  http://localhost:8080/api/v1/periods/$PERIOD_ID/leaderboard/snapshots

# Any member of the shop can list & view rows
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/periods/$PERIOD_ID/leaderboard

curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/leaderboard/snapshots/$SNAPSHOT_ID
```

