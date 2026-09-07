plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
    id("com.google.gms.google-services")
}

android {
    namespace = "com.methaltech.sacco_staff_app"
    packaging {
        resources {
            pickFirsts += setOf(
                "META-INF/androidx/annotation/annotation/LICENSE.txt",
                "/META-INF/androidx/annotation/annotation/LICENSE.txt",
            )
            excludes += setOf(
                "META-INF/androidx/annotation/annotation/LICENSE.txt",
                "/META-INF/androidx/annotation/annotation/LICENSE.txt",
                "META-INF/androidx/annotation/annotation/LICENSE-*.txt",
                "/META-INF/androidx/annotation/annotation/LICENSE-*.txt",
                "META-INF/androidx/annotation/**",
                "/META-INF/androidx/annotation/**",
            )
        }
    }
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        applicationId = "com.methaltech.sacco_staff_app"
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
        manifestPlaceholders["networkSecurityConfig"] = "@xml/network_security_config"
        manifestPlaceholders["usesCleartextTraffic"] = "true"
    }

    signingConfigs {
        create("release") {
            val storeFilePath = providers.gradleProperty("SACCO_STAFF_UPLOAD_STORE_FILE").orNull
                ?: System.getenv("SACCO_STAFF_UPLOAD_STORE_FILE")
            val storePasswordValue = providers.gradleProperty("SACCO_STAFF_UPLOAD_STORE_PASSWORD").orNull
                ?: System.getenv("SACCO_STAFF_UPLOAD_STORE_PASSWORD")
            val keyAliasValue = providers.gradleProperty("SACCO_STAFF_UPLOAD_KEY_ALIAS").orNull
                ?: System.getenv("SACCO_STAFF_UPLOAD_KEY_ALIAS")
            val keyPasswordValue = providers.gradleProperty("SACCO_STAFF_UPLOAD_KEY_PASSWORD").orNull
                ?: System.getenv("SACCO_STAFF_UPLOAD_KEY_PASSWORD")

            if (!storeFilePath.isNullOrBlank()) {
                storeFile = file(storeFilePath)
            }
            storePassword = storePasswordValue
            keyAlias = keyAliasValue
            keyPassword = keyPasswordValue
        }
    }

    buildTypes {
        debug {
            manifestPlaceholders["networkSecurityConfig"] = "@xml/network_security_config"
            manifestPlaceholders["usesCleartextTraffic"] = "true"
        }

        release {
            manifestPlaceholders["networkSecurityConfig"] = "@xml/network_security_config_prod"
            manifestPlaceholders["usesCleartextTraffic"] = "false"
            signingConfig = signingConfigs.getByName("release")
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}
