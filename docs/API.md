# API and testing guide

Base URL: `http://localhost:5080/api`. Swagger: `/swagger` in Development.

## Authentication sequence
1. GET `/auth/csrf` and retain both the returned token and antiforgery cookie.
2. POST `/auth/login` with JSON `{ "email": "admin@careflow.local", "password": "CareFlow@Demo2026!", "role": "Admin" }` and header `X-CSRF-TOKEN`.
3. Retain the session cookie. GET `/auth/csrf` again because the authenticated identity changed.
4. Send the refreshed token on every POST/PUT/DELETE. GET endpoints require only the session cookie.
5. POST `/auth/logout` to end the session.

The Postman collection has explicit token capture requests and stores IDs from created records. Postman must retain its cookie jar. For Swagger, first sign in using the web UI in the same browser; GET requests will carry the session. Mutations also need the CSRF header—Postman is the supplied complete mutation workflow.

## Routes
| Route | Methods | Access |
|---|---|---|
| /auth/csrf | GET | Anonymous/authenticated |
| /auth/login | POST | Anonymous, CSRF, rate limit |
| /auth/me | GET | Signed in |
| /auth/logout | POST | Signed in |
| /auth/users | POST | Admin |
| /patients | GET, POST | Admin/User |
| /patients/{id} | GET, PUT, DELETE | Admin/User |
| /admissions | GET, POST | Admin/User |
| /admissions/{id} | GET, PUT, DELETE | Admin/User |
| /departments, /wards, /beds | GET, POST | Admin |
| /departments/{id}, /wards/{id}, /beds/{id} | GET, PUT, DELETE | Admin |
| /notes, /plans, /followups | GET, POST | Admin/User |
| /notes/{id}, /plans/{id}, /followups/{id} | GET, PUT, DELETE | Admin/User |
| /hospital/lookups | GET | Admin/User; read-only resource metadata |
| /hospital/analytics?days=30 | GET | Admin/User |
| /hospital/generate-plan | POST | Admin/User |
| /hospital/import | POST | Admin |
| /hospital/export | GET | Admin |

List endpoints support `search`, `sort` (entity property), and `direction=asc|desc`. UI status filters are applied client-side to the returned records. The demonstration API does not implement pagination.

## Patient payload
```json
{"name":"Demo Person","medicalRecordNumber":"CF-9001","dateOfBirth":"1985-04-17","sex":"Female","phone":"555-0199","conditions":""}
```

## Admission payload
```json
{"patientId":1,"bedId":30,"admittedAt":"2026-11-22T08:00:00Z","diagnosis":"Observation","priority":"Routine","dischargedAt":null}
```

Use actual IDs and a current, nonfuture timestamp. Updates are full-record PUTs; keep all properties you intend to preserve. To discharge, PUT the record with `dischargedAt` set to the current timestamp. UTC timestamps are serialized consistently. Bed must be in service, and patient/bed intervals cannot overlap existing admissions. Date-only birthdates are stored at UTC midnight.

## Generation payload
```json
{"admissionId":25,"useAi":false}
```

Response includes `content`, `source`, and `approved:false`. Generation does not save a plan. POST/PUT `/plans` saves the reviewed text. `useAi:true` requires provider configuration. Generated output contains no claim of clinical validation.

## Import payload
`POST /hospital/import` receives a JSON `csv` string. The browser reads the selected CSV file and submits that string. Required header:

```csv
name,medicalRecordNumber,dateOfBirth,sex,phone
Demo Person,CF-9001,1985-04-17,Female,555-0199
```

Maximum 500 rows and 200,000 characters. Fields cannot contain embedded commas or newlines. Use yyyy-MM-dd. An invalid row rejects the whole batch.

## Response semantics
200 read/update; 201 created; 204 deleted/logged out; 400 validation/CSRF; 401 not signed in; 403 role denied; 404 not found; 409 uniqueness or dependent-history conflict; 429 login throttled; 502 provider failure; 503 provider configuration absent.

## Automated tests
`python3 tests/api_smoke.py` uses actual HTTP requests and cookies, not mocked repositories. Set `CAREFLOW_URL` to test another running Development instance. Tests create temporary records and delete them after successful completion. Run only against synthetic development data. Browser checks use the same live API through the frontend.
