FROM --platform=linux/amd64 eclipse-temurin:17-jdk-alpine AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN apk add --no-cache maven && mvn package -DskipTests -q

FROM --platform=linux/amd64 eclipse-temurin:17-jre-alpine
WORKDIR /app
RUN addgroup -S fanclash && adduser -S fanclash -G fanclash
COPY --from=build /app/target/fanclash-api-*.jar app.jar
USER fanclash
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "-Djava.security.egd=file:/dev/./urandom", "app.jar"]
