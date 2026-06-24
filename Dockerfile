# NutriFlow — container image for Google Cloud Run
FROM node:22-slim

WORKDIR /app

# Install dependencies first (layer cached unless lockfile changes).
COPY package*.json ./
RUN npm ci

# Copy the rest of the source and build the client + server bundle.
# Public VITE_* values are read from .env.production at build time (Vite),
# so they get baked into the client bundle. Real secrets (GEMINI_API_KEY)
# are NOT baked here — they are provided at runtime by Cloud Run.
COPY . .
RUN npm run build

ENV NODE_ENV=production

# Cloud Run sets PORT (default 8080); the server reads process.env.PORT.
EXPOSE 8080

CMD ["npm", "start"]
