import java.io.File
import org.apache.tools.ant.taskdefs.condition.Os
import org.gradle.api.DefaultTask
import org.gradle.api.GradleException
import org.gradle.api.logging.LogLevel
import org.gradle.api.tasks.Input
import org.gradle.api.tasks.TaskAction

open class BuildTask : DefaultTask() {
    @Input
    var rootDirRel: String? = null
    @Input
    var target: String? = null
    @Input
    var release: Boolean? = null

    @TaskAction
    fun assemble() {
        val executable = """C:\Program Files\nodejs\node""";
        try {
            runTauriCli(executable)
        } catch (e: Exception) {
            if (Os.isFamily(Os.FAMILY_WINDOWS)) {
                // Try different Windows-specific extensions
                val fallbacks = listOf(
                    "$executable.exe",
                    "$executable.cmd",
                    "$executable.bat",
                )
                
                var lastException: Exception = e
                for (fallback in fallbacks) {
                    try {
                        runTauriCli(fallback)
                        return
                    } catch (fallbackException: Exception) {
                        lastException = fallbackException
                    }
                }
                throw lastException
            } else {
                throw e;
            }
        }
    }

    /**
     * The Tauri CLI's JS entry point, to be run by node.
     *
     * The generated code passed a bare `tauri` as node's first argument, which only
     * works when node is actually handed a package manager (whose `tauri` script
     * resolves the binary). Run as `node tauri android …`, node reads "tauri" as a path
     * relative to the working directory and the build dies with
     * "Cannot find module '…/src-tauri/tauri'".
     *
     * Resolving the CLI's own entry point works no matter which package manager
     * installed it, and no matter which directory gradle is invoked from.
     */
    private fun cliScript(): String {
        val workingDir = File(project.projectDir, rootDirRel ?: "")
        // node_modules sits beside src-tauri, so walk up rather than hard-coding how
        // many levels separate gen/android/app from the project root.
        var dir: File? = workingDir
        while (dir != null) {
            val candidate = File(dir, "node_modules/@tauri-apps/cli/tauri.js")
            if (candidate.isFile) return candidate.absolutePath
            dir = dir.parentFile
        }
        throw GradleException("could not find @tauri-apps/cli/node_modules above ${workingDir.absolutePath}")
    }

    fun runTauriCli(executable: String) {
        val rootDirRel = rootDirRel ?: throw GradleException("rootDirRel cannot be null")
        val target = target ?: throw GradleException("target cannot be null")
        val release = release ?: throw GradleException("release cannot be null")
        val args = listOf(cliScript(), "android", "android-studio-script");

        project.exec {
            workingDir(File(project.projectDir, rootDirRel))
            executable(executable)
            args(args)
            if (project.logger.isEnabled(LogLevel.DEBUG)) {
                args("-vv")
            } else if (project.logger.isEnabled(LogLevel.INFO)) {
                args("-v")
            }
            if (release) {
                args("--release")
            }
            args(listOf("--target", target))
        }.assertNormalExitValue()
    }
}