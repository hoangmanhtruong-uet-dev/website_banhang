# Production Checklist

## 1. Environment Variables
- [ ] `DATABASE_URL`: Use a production-grade database (e.g., RDS, Supabase).
- [ ] `JWT_SECRET`: Set a strong, random secret.
- [ ] `NEXT_PUBLIC_APP_URL`: Set to the production domain.
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
- [ ] Use a non-root user in Docker.
- [ ] Implement graceful shutdown.