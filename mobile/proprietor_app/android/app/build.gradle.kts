plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

android {
    val releaseStoreFilePath = providers.gradleProperty("TEREKA_PROPRIETOR_UPLOAD_STORE_FILE").orNull
        ?: System.getenv("TEREKA_PROPRIETOR_UPLOAD_STORE_FILE")
    val releaseStorePassword = providers.gradleProperty("TEREKA_PROPRIETOR_UPLOAD_STORE_PASSWORD").orNull
        ?: System.getenv("TEREKA_PROPRIETOR_UPLOAD_STORE_PASSWORD")
    val releaseKeyAlias = providers.gradleProperty("TEREKA_PROPRIETOR_UPLOAD_KEY_ALIAS").orNull
        ?: System.getenv("TEREKA_PROPRIETOR_UPLOAD_KEY_ALIAS")
    val releaseKeyPassword = providers.gradleProperty("TEREKA_PROPRIETOR_UPLOAD_KEY_PASSWORD").orNull
        ?: System.getenv("TEREKA_PROPRIETOR_UPLOAD_KEY_PASSWORD")
    val hasReleaseSigning = listOf(
        releaseStoreFilePath,
        releaseStorePassword,
        releaseKeyAlias,
        releaseKeyPassword,
    ).all { !it.isNullOrBlank() }

    namespace = "com.methaltech.tereka_proprietor_app"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        // TODO: Specify your own unique Application ID (https://developer.android.com/studio/build/application-id.html).
        applicationId = "com.methaltech.tereka.proprietor"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        create("release") {
            if (!releaseStoreFilePath.isNullOrBlank()) {
                storeFile = file(releaseStoreFilePath)
            }
            storePassword = releaseStorePassword
            keyAlias = releaseKeyAlias
            keyPassword = releaseKeyPassword
        }
    }

    buildTypes {
        release {
            signingConfig = if (hasReleaseSigning) {
                signingConfigs.getByName("release")
            } else {
                signingConfigs.getByName("debug")
            }
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
