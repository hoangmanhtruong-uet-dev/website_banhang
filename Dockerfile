FROM node:18-alpine

# Install OpenSSL for Prisma compatibility
RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --ignore-scripts

# Copy Prisma schema
COPY prisma ./prisma

# Generate Prisma Client
RUN npx prisma generate

# Copy rest of the application
COPY . .

# Build Next.js app
RUN npm run build

# Expose port
EXPOSE 3000

# Start script: push DB schema then start app
CMD ["sh", "-c", "npx prisma db push --skip-generate && npm run start"]