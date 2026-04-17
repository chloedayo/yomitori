FROM gradle:8.4-jdk17 AS builder

WORKDIR /app
COPY build.gradle.kts settings.gradle.kts ./
COPY src/ src/

RUN gradle build -x test

FROM eclipse-temurin:17-jdk-jammy

WORKDIR /app

COPY --from=builder /app/build/libs/yomitori-0.1.0.jar /app/app.jar

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
