import com.android.build.gradle.BaseExtension

buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath("com.android.tools.build:gradle:8.11.0")
        // 2.x, not the 1.9.25 this file was generated with: Tauri's own Android module
        // (tauri/mobile/android/build.gradle.kts) configures the Kotlin compiler through
        // `android { kotlin { compilerOptions { … } } }`, and that DSL does not exist in
        // the Kotlin Gradle plugin before 2.0 — with 1.9.25 the module's build script
        // fails to compile with "Unresolved reference: kotlin".
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:2.1.21")
    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

// Tauri's own Android module (tauri/mobile/android) configures the Kotlin compiler
// through `android { kotlin { compilerOptions { … } } }` but only applies
// `com.android.library` to itself. Without the Kotlin Android plugin on *that* module
// the `kotlin` receiver does not exist inside `android`, and its build script fails to
// compile with "Unresolved reference: kotlin". This project's template only applies
// Kotlin to `:app`, so the module has to be given it here.
//
// `withId` rather than a plain apply: the Kotlin plugin has to land after
// `com.android.library`, and the module applies that inside its own `plugins` block.
subprojects {
    plugins.withId("com.android.library") {
        pluginManager.apply("org.jetbrains.kotlin.android")

        // AGP 8.11 defaults to build-tools 35.0.0, which is not installed here (36.0.0,
        // 36.1.0 and 37.0.0 are), and AGP will not fall back to a newer revision on its
        // own — it reports "Failed to find Build Tools revision 35.0.0" and stops.
        // Pinning here covers Tauri's module as well as :app, which sets its own.
        extensions.configure(BaseExtension::class.java) {
            buildToolsVersion = "36.0.0"
        }
    }
}

tasks.register("clean").configure {
    delete("build")
}

