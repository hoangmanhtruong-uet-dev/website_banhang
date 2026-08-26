# Production Checklist

## Release gate

Run these before every production deploy:

```bash
npm ci
npm run lint && npm run typecheck && npm test && npm run build
npm audit --omit=dev --audit-level=high
```

Run `npx prisma migrate deploy` as a release step, then start the app through a
process supervisor with `npm start`. Store the production environment in the
deployment secret manager (or a protected `.env` file), never in Git.

## 1. Environment Variables
- [ ] `DATABASE_URL`: Use a production-grade database (e.g., RDS, Supabase).
- [ ] `JWT_SECRET`: Set a strong, random secret.
- [ ] `NEXT_PUBLIC_APP_URL` and `API_ALLOWED_ORIGINS`: Set to the exact HTTPS production origin(s).
- [ ] `REFRESH_TOKEN_TTL`: Set a positive integer number of seconds (for example `604800`).
- [ ] `STORAGE_PROVIDER`: Set to `s3` or `cloudinary`.
- [ ] `CLOUDINARY_URL` or S3 credentials: Set if using object storage.

## 2. Database
- [ ] Enable automated backups.
- [ ] Use connection pooling (e.g., Prisma Accelerate or PgBouncer).
- [ ] Run `npx prisma migrate deploy` instead of `db push`.

## 3. Security
- [ ] Enable Rate Limiting (Redis adapter recommended for multi-instance).
- [ ] Set up CSRF protection.
- [ ] Ensure all cookies are `Secure` and `HttpOnly`.

## 4. Storage
- [ ] Configure persistent volumes if using `local` storage.
- [ ] Set up a CDN for uploaded assets.

## 5. Monitoring
- [ ] Integrate Sentry for error tracking.
- [ ] Set up health check monitoring on `/api/health/ready`.
- [ ] Configure structured logging to a central log management system.

## 6. Deployment
- [ ] Run the app under a dedicated non-privileged operating-system user.
- [ ] Implement graceful shutdown.
