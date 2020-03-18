import org.gradle.kotlin.dsl.version

// https://plugins.gradle.org/search?term=org.jetbrains.kotlin&page=1
plugins {
  val kotlinVersion = "1.3.70"

  //id("org.jetbrains.kotlin.jvm").version("1.3.70")
  kotlin("jvm") version kotlinVersion
  // https://kotlinlang.org/docs/reference/compiler-plugins.html
  // id "org.jetbrains.kotlin.plugin.spring" version "1.3.70"
  kotlin("plugin.spring") version kotlinVersion
//  id("com.github.johnrengelman.shadow") version "5.2.0"
  id("org.springframework.boot") version "2.2.5.RELEASE"
  id("io.spring.dependency-management") version "1.0.9.RELEASE"
}

group = "org.example"
version = "1.0-SNAPSHOT"

repositories {
  mavenCentral()
}

dependencies {
  implementation(kotlin("stdlib-jdk8"))
  implementation(kotlin("reflect"))

  implementation("org.springframework.boot:spring-boot-starter-webflux")
  implementation("io.projectreactor.kotlin:reactor-kotlin-extensions")
  implementation("org.springframework:spring-context") {
    exclude(module = "spring-aop")
  }

  implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
  implementation("com.fasterxml.jackson.datatype:jackson-datatype-jsr310")
}

tasks {
  compileKotlin {
    kotlinOptions {
      jvmTarget = "1.8"
      freeCompilerArgs = listOf("-Xjsr305=strict")
    }
  }
}