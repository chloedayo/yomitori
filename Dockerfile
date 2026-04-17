FROM gradle:8.4-jdk17 AS builder

WORKDIR /app
COPY build.gradle.kts .
COPY settings.gradle.kts .
COPY src/ src/

RUN gradle build -x test

FROM openjdk:17-slim

WORKDIR /app
COPY --from=builder /app/build/libs/*.jar app.jar

ENTRYPOINT ["java", "-jar", "app.jar"]
