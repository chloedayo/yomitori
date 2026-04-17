FROM gradle:8.4-jdk17 AS builder

WORKDIR /app
COPY build.gradle.kts .
COPY settings.gradle.kts .
COPY src/ src/

RUN gradle build -x test

FROM eclipse-temurin:17-jdk-jammy

WORKDIR /app
COPY --from=builder /app/build/libs/*.jar /app/

ENTRYPOINT ["java", "-jar", "app.jar"]
