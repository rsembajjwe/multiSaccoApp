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
            // androidx.annotation and androidx.annotation-jvm both ship identical
            // META-INF license files, which breaks mergeDebugJavaResource. Drop the
            // duplicates here. IMPORTANT: do not also list any of these in
            // pickFirsts -- a path present in both excludes and pickFirsts is
            // contradictory and AGP 9 then applies neither action, so the duplicate
            // resurfaces as a "2 files found" merge failure.
            excludes += setOf(
                // Both leading-slash and no-slash forms, so the match is anchor-agnostic.
                "/META-INF/androidx/annotation/**",
                "META-INF/androidx/annotation/**",
                "/META-INF/androidx/**/LICENSE.txt",
                "META-INF/androidx/**/LICENSE.txt",
                "/META-INF/androidx/**/LICENSE-*.txt",
                "META-INF/androidx/**/LICENSE-*.txt",
                "/META-INF/{AL2.0,LGPL2.1}",
                "/META-INF/DEPENDENCIES",
                "/META-INF/LICENSE",
                "/META-INF/LICENSE.txt",
                "/META-INF/LICENSE.md",
                "/META-INF/NOTICE",
                "/META-INF/NOTICE.txt",
                "/META-INF/NOTICE.md",
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
