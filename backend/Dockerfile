# 빌드 스테이지
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app

# Maven 설치
RUN apt-get update && apt-get install -y maven

# pom.xml 복사 및 의존성 다운로드
COPY pom.xml ./
RUN mvn dependency:go-offline -B

# 소스 코드 복사 및 빌드
COPY src ./src
RUN mvn clean package -DskipTests

# 실행 스테이지
FROM eclipse-temurin:21-jre
WORKDIR /app

# 빌드된 JAR 파일 복사
COPY --from=build /app/target/*.jar app.jar

# 포트 노출
EXPOSE 8080

# 애플리케이션 실행
ENTRYPOINT ["java", "-jar", "app.jar"]
