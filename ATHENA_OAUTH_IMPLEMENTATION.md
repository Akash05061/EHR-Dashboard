# Athena Health 3-Legged OAuth Implementation Guide

## Overview
This document outlines the implementation of Athena Health's 3-legged OAuth flow for the EHR Dashboard, allowing clinics to connect without sharing client credentials.

## What You Need From Your Side

### 1. Register Your App with Athena Health (One-time setup)
- Go to Athena Developer Portal
- Create a **3-legged OAuth application** (NOT 2-legged)
- Select **Provider-facing app** type
- Get YOUR OAuth credentials:
  - `ATHENA_CLIENT_ID` (your app's ID)
  - `ATHENA_CLIENT_SECRET` (your app's secret)
- Set redirect URI: `https://yourdomain.com/api/auth/athena/callback`

### 2. Required Environment Variables
```env
# Your OAuth app credentials (NOT clinic credentials)
ATHENA_CLIENT_ID=your_oauth_app_client_id
ATHENA_CLIENT_SECRET=your_oauth_app_client_secret
ATHENA_BASE_URL=https://api.preview.platform.athenahealth.com
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

## How 3-Legged OAuth Flow Works

```
1. Clinic User visits your dashboard
2. Dashboard shows "Connect with Athena" button
3. User clicks connect → Redirected to Athena login
4. User enters THEIR Athena credentials (username/password)
5. Athena shows permission screen for your app
6. User approves access to their clinic data
7. Athena redirects back to your app with authorization code
8. Your app exchanges code for access token
9. Your app can now access that clinic's data using the token
10. Each clinic gets their own token → sees only their data
```

## Required OAuth Scopes for Provider-Facing Apps

Based on Athena documentation, your app needs these scopes:

### Core Scopes
- `launch` - Required for provider EHR launch
- `openid` - OpenID Connect
- `fhirUser` - User identity
- `offline_access` - Refresh tokens

### Data Access Scopes (Provider-facing)
- `user/Patient.read` - Read patient data
- `user/Appointment.read` - Read appointments
- `user/Practitioner.read` - Read provider info
- `user/Organization.read` - Read clinic info
- `user/Observation.read` - Read vital signs/lab results
- `user/AllergyIntolerance.read` - Read allergies
- `user/Medication.read` - Read medications
- `user/Condition.read` - Read conditions/diagnoses
- `user/Encounter.read` - Read visits/encounters

## Key Differences: 2-Legged vs 3-Legged

| Aspect | 2-Legged (Current) | 3-Legged (Needed) |
|--------|-------------------|-------------------|
| **Who provides credentials** | Clinic needs client ID/secret | Only you need OAuth app credentials |
| **User consent** | No user interaction | User must approve access |
| **Data access** | All data with valid credentials | Only data user has access to |
| **Scope prefix** | `system/` | `user/` or `patient/` |
| **Use case** | System-to-system | User-authorized access |

## Implementation Benefits

### For Clinics
- ✅ No need for developer credentials
- ✅ Standard login with their Athena username/password
- ✅ Control over what data they share
- ✅ Can revoke access anytime

### For Your Dashboard
- ✅ Support multiple clinics simultaneously
- ✅ Each clinic sees only their data
- ✅ Secure token-based access
- ✅ Standard OAuth 2.0 compliance

## Security & Compliance

### Token Management
- Access tokens expire (typically 1 hour)
- Refresh tokens for long-term access
- Store tokens securely (encrypted in database)
- Implement token refresh logic

### Data Isolation
- Each clinic gets separate session
- Tokens are clinic-specific
- No cross-clinic data access
- Audit trail for data access

### HIPAA Compliance
- Encrypted token storage
- Secure session management
- User consent tracking
- Access logging

## Technical Implementation Steps

### 1. OAuth Endpoints
- `/api/auth/athena/login` - Initiate OAuth flow
- `/api/auth/athena/callback` - Handle OAuth callback
- `/api/auth/athena/logout` - Revoke tokens

### 2. Session Management
- Store clinic sessions in database
- Implement middleware for authentication
- Handle token refresh automatically

### 3. Multi-tenant Data Access
- Modify existing APIs to use clinic-specific tokens
- Add clinic context to all data requests
- Implement data filtering by clinic

### 4. User Interface Updates
- Add login page with "Connect with Athena" button
- Show clinic name in dashboard header
- Add logout functionality
- Display connection status

## Database Schema Updates

```sql
-- Clinic management
CREATE TABLE clinics (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  athena_practice_id VARCHAR(50),
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User sessions
CREATE TABLE clinic_sessions (
  id SERIAL PRIMARY KEY,
  clinic_id INTEGER REFERENCES clinics(id),
  session_token VARCHAR(255) UNIQUE,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Error Handling

### Common OAuth Errors
- `access_denied` - User denied permission
- `invalid_request` - Malformed OAuth request
- `invalid_client` - Invalid client credentials
- `invalid_grant` - Invalid authorization code

### Token Errors
- `invalid_token` - Expired or invalid access token
- `insufficient_scope` - Token lacks required permissions

## Testing Strategy

### 1. OAuth Flow Testing
- Test authorization redirect
- Test callback handling
- Test token exchange
- Test error scenarios

### 2. Multi-tenant Testing
- Multiple clinic connections
- Data isolation verification
- Session management testing

### 3. Token Management Testing
- Token refresh functionality
- Token expiration handling
- Secure token storage

## Production Deployment

### Environment Setup
- Use production Athena URLs
- Secure token storage (encrypted)
- HTTPS for all OAuth redirects
- Proper session security

### Monitoring
- OAuth flow success/failure rates
- Token refresh frequency
- API call patterns per clinic
- Error tracking and alerting

## Support & Maintenance

### User Support
- Clear error messages for OAuth failures
- Help documentation for clinic users
- Support contact for connection issues

### Maintenance
- Regular token cleanup
- Session management
- API usage monitoring
- Security updates