FROM eclipse-temurin:17-jdk-alpine AS build

WORKDIR /workspace
COPY . .
RUN chmod +x mvnw && ./mvnw -DskipTests package

FROM eclipse-temurin:17-jre-alpine

WORKDIR /app
RUN addgroup -S sacco && adduser -S sacco -G sacco
COPY --from=build /workspace/target/sacco-backend-0.0.1-SNAPSHOT.jar /app/sacco-backend.jar
USER sacco

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/sacco-backend.jar"]
