# Build stage
FROM node:22-alpine AS build

WORKDIR /app
COPY . .
WORKDIR /app/src/web/frontend
RUN npm ci && npm run build

# Runtime stage
FROM python:3.12-slim

WORKDIR /app
COPY . .
COPY --from=build /app/src/web/frontend/build /app/src/web/frontend/build

RUN pip install --no-cache-dir -r requirements.txt

# for now, selenium fails for some reason, so we disable it for now
# RUN apt-get update && apt-get install -y xvfb

COPY <<EOF ./src/web/backend/config.py
DEBUG, HOST, PORT = True, "0.0.0.0", 5000
EOF

EXPOSE 5000
CMD ["python", "-m", "src.web.backend.server"]