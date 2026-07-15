# API Route Map

Base path: `/api/v1`

All JSON responses should follow one of these shapes:

```json
{ "data": {} }
```

```json
{
  "error": {
    "timestamp": "2026-07-15T12:00:00.000Z",
    "status": 400,
    "code": "VALIDATION_ERROR",
    "message": "A required field is missing.",
    "correlationId": "req_..."
  }
}
```

## Foundation Routes

| Method | Route | Purpose | Auth |
| --- | --- | --- | --- |
| GET | `/health` | Service health check. | Public |
| GET | `/tenants` | List tenants visible to current user. | Required |
| GET | `/tenants/:id` | Get one tenant. | Required |
| POST | `/tenants` | Submit/create tenant. | Platform admin or public registration flow |
| PATCH | `/tenants/:id/status` | Approve, activate, suspend, or terminate tenant. | Platform admin |
| GET | `/users` | List users in current tenant. | Required |
| POST | `/users` | Create a user with hashed password. | Admin |
| POST | `/auth/login` | Authenticate user. | Public |
| POST | `/auth/logout` | End current session. | Required |
| GET | `/auth/me` | Get current authenticated user. | Required |
| POST | `/member-auth/login` | Authenticate a member with membership number, phone, or email. | Public |
| GET | `/member-auth/me` | Get current member profile, tenant, branch, and balances. | Member |
| POST | `/member-auth/logout` | End current member session. | Member |
| GET | `/roles` | List roles for current tenant. | Required |
| POST | `/roles` | Create custom role. | Admin |
| GET | `/permissions` | List known permissions. | Required |
| GET | `/audit-events` | List tenant audit events. | Required |
| POST | `/audit-events` | Write an audit event. | Internal/admin |
| GET | `/subscription-packages` | List platform subscription packages. | Required |
| GET | `/subscriptions` | List visible subscriptions. | Required |
| POST | `/subscriptions/:id/payments` | Record a subscription payment. | Platform admin |

## Onboarding and Membership Routes

| Method | Route | Purpose | Auth |
| --- | --- | --- | --- |
| GET | `/branches` | List tenant branches. | Required |
| POST | `/branches` | Create branch. | SACCO admin |
| GET | `/members` | List tenant members. | Required |
| POST | `/members` | Register member. | SACCO staff |
| GET | `/members/:id` | Get member profile. | Required |
| PATCH | `/members/:id/status` | Approve, suspend, activate, or exit member. | Authorized approver |
| GET | `/members/:id/documents` | List member documents. | Required |
| POST | `/members/:id/documents` | Upload/register member document metadata. | SACCO staff |
| GET | `/financial-transactions` | List tenant financial transactions. | Required |
| POST | `/financial-transactions` | Submit a pending financial transaction. | SACCO staff |
| PATCH | `/financial-transactions/:id/status` | Post or reject a pending financial transaction. | Authorized checker |
| GET | `/loans` | List tenant loan applications and files. | Required |
| POST | `/loans` | Submit a loan application for an active member. | SACCO staff |
| GET | `/approval-workflows` | List workflows. | Admin |
| POST | `/approval-workflows` | Create workflow. | Admin |
| GET | `/approval-decisions` | List pending or historical decisions. | Required |
| POST | `/approval-decisions` | Record approval decision. | Authorized approver |

## Current Sprint 1 API Implementation

Implemented in the no-dependency development server:

- `GET /api/v1/health`
- `GET /api/v1/tenants`
- `GET /api/v1/tenants/:id`
- `POST /api/v1/tenants`
- `PATCH /api/v1/tenants/:id/status`
- `GET /api/v1/users`
- `POST /api/v1/users`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/logout`
- `POST /api/v1/member-auth/login`
- `GET /api/v1/member-auth/me`
- `POST /api/v1/member-auth/logout`
- `GET /api/v1/roles`
- `GET /api/v1/permissions`
- `GET /api/v1/audit-events`
- `POST /api/v1/audit-events`
- `GET /api/v1/subscription-packages`
- `GET /api/v1/subscriptions`
- `POST /api/v1/subscriptions/:id/payments`
- `GET /api/v1/branches`
- `POST /api/v1/branches`
- `GET /api/v1/members`
- `POST /api/v1/members`
- `GET /api/v1/members/:id`
- `PATCH /api/v1/members/:id/status`
- `GET /api/v1/members/:id/documents`
- `POST /api/v1/members/:id/documents`
- `GET /api/v1/financial-transactions`
- `POST /api/v1/financial-transactions`
- `PATCH /api/v1/financial-transactions/:id/status`
- `GET /api/v1/loans`
- `POST /api/v1/loans`

The development server uses an in-memory store seeded at startup. PostgreSQL migrations are documented separately and will replace the development store in the next backend step.
