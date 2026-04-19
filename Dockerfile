FROM eclipse-temurin:17-jdk-jammy

WORKDIR /app

# Copy pre-built JAR (from ./build.sh)
COPY build/libs/yomitori-0.1.0.jar /app/app.jar

RUN chmod 777 /app

ENTRYPOINT ["java", "-XX:-TieredCompilation", "-Xmx512m", "-jar", "/app/app.jar"]
