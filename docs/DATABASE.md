# VOJAS Database Schema

## Current State
Database schema not yet created. Will be implemented in Phase 1 (backend foundation).

## Technology
- **Development**: SQLite (file-based, zero-config)
- **Production**: PostgreSQL
- **ORM**: Prisma

## Planned Models

### User
```
User {
  id            String    @id @default(uuid())
  email         String    @unique
  password      String    (hashed)
  name          String
  role          Role      @default(VIEWER)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}
```

### Project
```
Project {
  id              String    @id @default(uuid())
  name            String
  description     String?
  status          ProjectStatus
  sectorId        String
  districtId      String
  constituencyId  String?
  approvedAmount  Float
  spentAmount     Float     @default(0)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

### Location
```
Location {
  id          String  @id @default(uuid())
  projectId   String  @unique
  latitude    Float
  longitude   Float
  address     String?
  district    String
  state       String
  pincode     String?
}
```

### Report
```
Report {
  id          String    @id @default(uuid())
  title       String
  description String
  category    String
  latitude    Float?
  longitude   Float?
  status      ReportStatus @default(SUBMITTED)
  citizenName String?
  citizenPhone String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

### Anomaly
```
Anomaly {
  id          String    @id @default(uuid())
  projectId   String
  type        AnomalyType
  severity    Severity
  description String
  evidence    Json?
  verified    Boolean   @default(false)
  verifiedBy  String?
  verifiedAt  DateTime?
  createdAt   DateTime  @default(now())
}
```

### AuditLog
```
AuditLog {
  id          String    @id @default(uuid())
  userId      String
  action      String
  resource    String
  resourceId  String
  details     Json?
  ipAddress   String?
  createdAt   DateTime  @default(now())
}
```

## Enums (planned)
```prisma
enum Role {
  ADMIN
  OFFICER
  REVIEWER
  ANALYST
  VIEWER
}

enum ProjectStatus {
  PROPOSED
  APPROVED
  IN_PROGRESS
  COMPLETED
  VERIFIED
  CANCELLED
}

enum ReportStatus {
  SUBMITTED
  REVIEWING
  VALIDATED
  REJECTED
  RESOLVED
}

enum AnomalyType {
  COST_ANOMALY
  DELAY_ANOMALY
  DUPLICATE_PROJECT
  FINANCIAL_MISMATCH
  DOCUMENT_INCONSISTENCY
  GEO_INCONSISTENCY
  SUSPICIOUS_PATTERN
}

enum Severity {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}
```

## Implementation Order
1. User model (Phase 3 — Authentication)
2. Project model (Phase 4 — Project Management)
3. Location model (Phase 5 — Maps)
4. Report model (Phase 6 — Citizens)
5. Financial models (Phase 7 — Financial)
6. Document model (Phase 8 — Documents)
7. Anomaly model (Phase 9 — Anomalies)
8. AuditLog model (Phase 3 — Auth audit trail)

## Migrations Strategy
- Use `npx prisma migrate dev` for development
- Generate migration SQL for production
- Never run migrations automatically in production
