FROM gradle:8.4-jdk17 AS builder

WORKDIR /app
COPY build.gradle.kts settings.gradle.kts ./
COPY src/ src/

RUN gradle bootJar -x test

FROM eclipse-temurin:17-jdk-jammy

WORKDIR /app

# Copy bootJar output (Spring Boot creates the executable jar here)
COPY --from=builder /app/build/libs/yomitori-0.1.0.jar /app/app.jar

# Ensure app directory is writable
RUN chmod 777 /app

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
