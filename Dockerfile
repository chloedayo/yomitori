FROM gradle:8.4-jdk17 AS builder

WORKDIR /app
COPY build.gradle.kts settings.gradle.kts ./
COPY src/ src/

RUN gradle build -x test

FROM eclipse-temurin:17-jdk-jammy

WORKDIR /app

COPY --from=builder /app/build/libs/ /app/

ENTRYPOINT ["sh", "-c", "java -jar /app/yomitori-*.jar | grep -v plain || java -jar /app/yomitori-*.jar"]
