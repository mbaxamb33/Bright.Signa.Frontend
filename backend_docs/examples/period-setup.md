# Period Setup (curl walkthrough)

Assumes you have a `shop_id`, `period_id` and a JWT `$TOKEN` with owner/manager role.

## 1) Create period (e.g., Dec 2025)

```
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"year":2025,"month":12}' \
  http://localhost:8080/api/v1/shops/$SHOP_ID/periods
```

## 2) Set monthly targets

```
curl -s -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '[{"category_id":"revenue","target_value":"10000.00"}]' \
  http://localhost:8080/api/v1/periods/$PERIOD_ID/targets
```

## 3) Set weekly distribution (must be 100% at publish/lock)

```
curl -s -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '[{"week_index":1,"percentage":"25.00"},{"week_index":2,"percentage":"25.00"},{"week_index":3,"percentage":"25.00"},{"week_index":4,"percentage":"25.00"}]' \
  http://localhost:8080/api/v1/periods/$PERIOD_ID/weekly-distribution
```

## 4) Set weekly role weights per week (sum 100 per week)

```
# Week 1: 60% sales_junior, 40% manager
curl -s -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '[{"role":"sales_junior","weight_percentage":"60.00"},{"role":"manager","weight_percentage":"40.00"}]' \
  http://localhost:8080/api/v1/periods/$PERIOD_ID/role-weights/1
```

## 5) Recompute user week targets

```
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/periods/$PERIOD_ID/recompute
```

## 6) Publish/Lock period (validates exact 100% sums)

```
# Publish
curl -s -X PATCH \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"published"}' \
  http://localhost:8080/api/v1/periods/$PERIOD_ID/status
```

