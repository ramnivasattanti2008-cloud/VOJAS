# VOJAS API Documentation

## Base URL
- Development: `http://localhost:5000/api/v1`
- Production: (TBD)

## API Versioning
All routes are prefixed with `/api/v1`. Future breaking changes will use `/api/v2`.

## Authentication
Most routes require a Bearer token:
```
Authorization: Bearer <jwt_token>
```

## Response Format
All responses follow this structure:
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": { "timestamp": "2026-08-30T10:00:00Z" }
}
```

Error response:
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": { ... }
  }
}
```

## Implemented Endpoints

### Health Check
**`GET /api/v1/health`**
- Auth: Not required
- Description: Check if the API is running
- Response:
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "VOJAS API",
    "version": "1.0.0",
    "uptime": 1234,
    "timestamp": "2026-08-30T10:00:00Z"
  }
}
```

---

## Planned Endpoints (not yet implemented)

### Authentication
- `POST /api/v1/auth/register` — Register new user
- `POST /api/v1/auth/login` — Login
- `POST /api/v1/auth/logout` — Logout
- `GET /api/v1/auth/me` — Get current user
- `POST /api/v1/auth/refresh` — Refresh token

### Users
- `GET /api/v1/users` — List users (Admin only)
- `GET /api/v1/users/:id` — Get user
- `PUT /api/v1/users/:id` — Update user
- `DELETE /api/v1/users/:id` — Delete user (Admin only)

### Projects
- `GET /api/v1/projects` — List projects
- `POST /api/v1/projects` — Create project
- `GET /api/v1/projects/:id` — Get project details
- `PUT /api/v1/projects/:id` — Update project
- `DELETE /api/v1/projects/:id` — Soft delete

### Reports
- `POST /api/v1/reports` — Submit citizen report
- `GET /api/v1/reports` — List reports (Officer)
- `GET /api/v1/reports/:id` — Get report
- `PUT /api/v1/reports/:id` — Update report status

### Anomalies
- `GET /api/v1/anomalies` — List detected anomalies
- `GET /api/v1/anomalies/:id` — Get anomaly details
- `POST /api/v1/anomalies/:id/verify` — Mark as verified

### Risk
- `GET /api/v1/risk/:projectId` — Get risk score for project
- `GET /api/v1/risk/summary` — Risk summary dashboard

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request / Validation Error |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict (duplicate) |
| 500 | Internal Server Error |

## Error Codes

| Code | Description |
|------|-------------|
| VALIDATION_ERROR | Input failed validation |
| UNAUTHORIZED | Missing or invalid token |
| FORBIDDEN | Insufficient permissions |
| NOT_FOUND | Resource not found |
| CONFLICT | Resource already exists |
| INTERNAL_ERROR | Server error |
