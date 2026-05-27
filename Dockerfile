# ---- Frontend build stage ----
FROM node:20-slim AS frontend

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --no-audit --no-fund

COPY frontend/ ./
RUN npm run build

# ---- Backend build stage ----
FROM maven:3.9.9-eclipse-temurin-21 AS backend

WORKDIR /app

COPY backend/pom.xml backend/pom.xml
COPY openapi openapi
WORKDIR /app/backend
RUN mvn -B -DskipTests dependency:go-offline

WORKDIR /app
COPY backend backend
COPY --from=frontend /app/frontend/dist backend/src/main/resources/static
WORKDIR /app/backend
RUN mvn -B -DskipTests package

# ---- Runtime ----
FROM eclipse-temurin:21-jre

WORKDIR /app

COPY --from=backend /app/backend/target/job-scout-1.0.0-SNAPSHOT.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
