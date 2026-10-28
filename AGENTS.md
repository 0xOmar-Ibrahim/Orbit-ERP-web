# AGENTS.md — Orbit ERP (web)

Orbit is an ERP system (graduation project) with a Django REST backend and React frontends. A Flutter mobile client also talks to the same API.

## ⚠️ External database — read this first

There is **no local database**. The backend connects directly to a **hosted Supabase PostgreSQL instance** (`aws-0-eu-west-1.pooler.supabase.com`, via the Supabase connection pooler, `sslmode=require`), configured in [backend/backend/settings.py](backend/backend/settings.py) under `DATABASES`.

That database is **shared by the whole team and every client** (web, admin panel, mobile). It holds the real data. So:

- **Do not run `migrate`, `makemigrations`, `flush`, `sqlflush`, `loaddata`, or any raw SQL / bulk writes** without the user's explicit approval. A migration applied by you is applied for everyone right away.
- If a model change is needed, write the model change and generate the migration file only when asked. Tell the user it still needs to be applied. Don't apply it yourself.
- Migrations must stay linear and conflict-free. Check the latest migration in the app before creating a new one, because teammates may have already applied theirs to the shared DB.
- `DISABLE_SERVER_SIDE_CURSORS = True` is required because of the Supabase pooler (transaction mode). Don't remove it.
- Tables use explicit `db_table` names (snake_case, e.g. `employee`, `customer`, `role_permission`) that match the Supabase schema. Keep them when editing models; renaming one renames the live table.
- Primary keys are explicit (`employee_id`, `customer_id`, `opportunity_id`, …), not Django's default `id`.
- Any reads you run against the DB (e.g. `manage.py shell`) hit production-like data. Keep them read-only.
- DB credentials and the Django `SECRET_KEY` are currently hardcoded in `settings.py`. Never copy them into other files, logs, commits, or messages. If you touch settings, prefer moving them to `backend/.env` (already loaded via `python-dotenv`) instead of adding more hardcoded secrets.

## Repository layout

```
Orbit-ERP-web/
├── backend/                     Django project (run commands from here)
│   ├── manage.py
│   ├── requirements.txt
│   ├── .venv/                   local virtualenv (not shared)
│   ├── backend/                 project package: settings.py, urls.py, wsgi/asgi
│   └── apps/
│       ├── helpers.py           shared utils: email validation, JWT payload + permissions,
│       │                        code generator (EMP-/CUS-YYYY-NNNN), IsAdministratorUser
│       ├── accounts/            custom user (Employee), Role/Module/Permission/RolePermission,
│       │                        Branch, RegistrationRequest, auth views, Google SSO (OIDC)
│       ├── admin_control/       admin login/logout, employee management, registration approval
│       ├── crm/                 LeadSource, Customer, Contact, Opportunity, Interaction, CustomerNote
│       ├── hr/                  Department, JobPosition, WorkSchedule, Attendance, Leave*, Payroll,
│       │                        Skills, Appraisal, Recruitment, Contracts… (models only, no API yet)
│       ├── projects/            placeholder (empty)
│       ├── accounting/          placeholder (empty)
│       └── reporting/           placeholder (empty)
├── Frontend/
│   ├── my-app/                  employee-facing React app (login, sign-up, home, change password)
│   └── my_first_app/            admin-panel React app (admin login, employee management, add employee)
└── Orbit.postman_collection.json   API collection; keep it in sync when endpoints change
```

## Backend

**Stack:** Django 6.x, Django REST Framework, `djangorestframework-simplejwt` (with token blacklist), `django-cors-headers`, Authlib (Google OIDC SSO), `python-dotenv`, `psycopg2-binary`.

### Setup / run

```bash
cd backend
python -m venv .venv && .venv\Scripts\activate     # Windows
pip install -r requirements.txt
python manage.py runserver                          # http://127.0.0.1:8000
```

`backend/.env` (optional; never commit it) supplies `SSO_CLIENT_ID`, `SSO_CLIENT_SECRET`, `SSO_ISSUER`.

`python manage.py seed_permissions` seeds the `module` / `permission` tables. It's idempotent, but it still writes to the shared DB, so ask first.

### URL routing ([backend/backend/urls.py](backend/backend/urls.py))

| Prefix       | App            | Notes |
|--------------|----------------|-------|
| `/api/auth/` | `accounts`     | `login/`, `signup/`, `logout/`, `me/`, `refresh/`, `get_employee_status/`, `sso/`, `sso/callback/`, `sso_mobile/` |
| `/crm/`      | `crm`          | `customers`, `contacts`, `interactions`, `lead_sources`, `opportunity`/`opportunities`, `opportunities_view`, customer notes (many aliases) |
| `/admin/`    | `admin_control`| Custom admin API, **not** the Django admin site. `login/`, `logout/`, `employee/`, `employee/registration_requests/`, `approved/employee/` |

CRM routes are registered both with and without trailing slashes (plus naming aliases). When you add a CRM route, follow the same pattern.

### Auth model

- `AUTH_USER_MODEL = "accounts.Employee"`. Login is by work email. The JWT user id field is `employee_id`.
- Default DRF auth order: `CookieJWTAuthentication` (reads the `access_token` cookie) → header `JWTAuthentication` → `SessionAuthentication`. The default permission is `IsAuthenticated`.
- Web clients get the refresh token as an httpOnly cookie. Requests with the header `X-Client-Type: Flutter` (mobile) get both tokens in the JSON body instead.
- Access token lives 24h, refresh 7 days. Logout blacklists the refresh token.
- RBAC: `Employee.role` → `Role` → `RolePermission(module, permission)`. Permission names are namespaced `"<module>.<action>"` (e.g. `crm.edit_customer`). The login payload includes the permission list (see `get_user_permissions` in `apps/helpers.py`).
- Admin-only endpoints use `IsAdministratorUser` (`is_superuser`).
- New employees sign up via a `RegistrationRequest`, which an admin approves.

### Conventions

- Views are `APIView` classes with explicit `get/post/patch/put/delete`. IDs come from query params or the body (e.g. `?opportunity_id=`), validated with `is_valid_id`. Responses look like `{"message": ..., "<entity>": ...}` or `{"error": ...}`.
- Separate serializers for create vs. update (`AddCustomerSerializer` / `UpdateCustomerSerializer`).
- List endpoints use either `StandardPagination` (`crm/pagination.py`, page size 10, max 100) or `startrange`/`endrange` slicing.
- Model docstrings name the table: `"""X Table — description (db_table: x)"""`. Keep that style.
- Commit messages are prefixed, e.g. `[main] V1.33.1 ...` or `[HR-DATABASE-MODULE] ...`.
- There are no automated tests yet. Verify changes with `python manage.py check` and the Postman collection.

### CORS / hosts

Allowed origins are `http://localhost:3000` and a team ngrok tunnel (also listed in `ALLOWED_HOSTS` / `CSRF_TRUSTED_ORIGINS`). If the frontend port or tunnel changes, update all three lists.

## Frontend

Both apps are Create React App (React 19, react-router-dom 7). Plain JSX + CSS per component, no TypeScript, no state library.

```bash
cd Frontend/my-app          # or Frontend/my_first_app
npm install
npm start                   # http://localhost:3000
```

- `my-app`: API calls go through `src/services/api.js` (`API_BASE_URL = http://localhost:8000/api`). It stores the access token in `localStorage`.
- `my_first_app` (admin): uses `src/Utils/authFetch.js` against `http://127.0.0.1:8000`. Tokens go in `sessionStorage`, with automatic refresh on 401.
- Both run on port 3000 by default, so run one at a time or set `PORT`.

## Housekeeping

- `__pycache__/*.pyc` files are committed to the repo (there's no `.gitignore`). Don't add more; ideally add a `.gitignore` covering `__pycache__/`, `.venv/`, `.env`, `node_modules/`.
- `backend/psycopg2_binary-*.whl` is a vendored wheel for Windows/Python 3.11 installs.
- `DEBUG = True` and the insecure settings are development-only.
