plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
    id("com.google.gms.google-services")
}

android {
    namespace = "com.methaltech.sacco_member_app"
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
        // TODO: Specify your own unique Application ID (https://developer.android.com/studio/build/application-id.html).
        applicationId = "com.methaltech.sacco_member_app"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion  // Firebase requires API 23+
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    buildTypes {
        release {
            // TODO: Add your own signing config for the release build.
            // Signing with the debug keys for now, so `flutter run --release` works.
            signingConfig = signingConfigs.getByName("debug")
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
