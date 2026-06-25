# Database Schema

Civic Watch Hub uses Supabase (PostgreSQL) for its backend. We utilize JSONB and Array columns to reduce the need for complex, heavy joins for simple features like timelines and subscriptions.

## `users` (Managed by Supabase Auth)
The standard authentication table. We store extended user profiles (like usernames) in the `reports` and `comments` tables directly for speed, rather than maintaining a separate `profiles` table for this MVP.

## `reports`
The core table storing every civic issue.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | `uuid` | `uuid_generate_v4()` | Primary Key |
| `createdAt` | `timestamp` | `now()` | When the issue was reported |
| `userId` | `uuid` | | Foreign key to auth.users |
| `userName` | `text` | | Denormalized display name |
| `lat` | `float` | | Latitude coordinate |
| `lng` | `float` | | Longitude coordinate |
| `imageUrl` | `text` | | URL to Supabase Storage bucket |
| `description` | `text` | | Original user description or AI description |
| `status` | `text` | `'OPEN'` | `'OPEN'` or `'RESOLVED'` |
| `verifiedBy` | `text[]` | `[]` | Array of User IDs who verified the issue |
| `resolvedBy` | `text[]` | `[]` | Array of User IDs who voted to resolve |
| `category` | `text` | | AI-generated category (e.g., "Pothole") |
| `severity` | `text` | | AI-generated severity (e.g., "Critical") |
| `subscribers` | `text[]` | `[]` | Array of User IDs subscribed to updates |
| `history` | `jsonb` | `[]` | Audit timeline of events (Created, Verified, Resolved, Updated) |
| `triageClassification` | `text` | `'NEW_INCIDENT'` | AI Classification: NEW_INCIDENT, LIKELY_DUPLICATE, RELATED_CLUSTER |
| `triageConfidence` | `float` | `1.0` | Confidence score for the triage classification |
| `duplicateOf` | `uuid` | | Foreign key linking to the primary report if duplicate |
| `relatedReportIds` | `uuid[]` | `[]` | Array of related report IDs if part of a cluster |
| `clusterKey` | `text` | | Hash identifying the hotspot cluster |
| `priorityScore` | `integer` | `50` | Deterministic priority score (0-100) |
| `priorityBand` | `text` | `'MEDIUM'` | LOW, MEDIUM, HIGH, CRITICAL |
| `recommendedAction` | `text` | | Action suggested by the AI triage |
| `triageReasoning` | `text` | | Explanation of the triage decision |
| `caseBrief` | `jsonb` | `{}` | AI generated operational case brief |
| `triageSignals` | `jsonb` | `{}` | Raw deterministic signals used for scoring |
| `userOverride` | `boolean` | `false` | True if the user manually overrode the AI's deduplication |

## `comments`
Stores discussion board messages for specific issues.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | `uuid` | `uuid_generate_v4()` | Primary Key |
| `report_id` | `uuid` | | Foreign key to `reports(id)` |
| `user_id` | `uuid` | | Foreign key to auth.users |
| `user_name`| `text` | | Denormalized display name |
| `content` | `text` | | The comment body |
| `created_at`| `timestamp`| `now()` | When the comment was posted |

---

### Architectural Note on Arrays vs. Joins
We consciously chose to use `text[]` (Array) columns for `verifiedBy`, `resolvedBy`, and `subscribers`. In a traditional relational model, these would be separate tables (e.g., `ReportVerifications`). 

However, for a heavily read-focused application where we need to quickly load 100+ map pins and immediately know how many verifications each has, arrays are significantly faster and reduce join overhead. Since these lists rarely exceed 10-20 items per report, PostgreSQL handles them effortlessly.
