FROM gradle:8.4-jdk17 AS builder

WORKDIR /app
COPY build.gradle.kts settings.gradle.kts ./
COPY src/ src/

RUN gradle build -x test --info

FROM eclipse-temurin:17-jdk-jammy

WORKDIR /app

# Copy jar from builder, using find to handle any naming
COPY --from=builder /app/build/libs/ /app/

# List what we have for debugging
RUN ls -la /app/

# Run the jar (find it dynamically)
ENTRYPOINT ["sh", "-c", "java -jar /app/*.jar"]
