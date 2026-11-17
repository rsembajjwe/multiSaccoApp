package com.methaltech.sacco_staff_app

import android.os.Build
import io.flutter.embedding.android.FlutterFragmentActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

// local_auth (biometric app lock) requires a FragmentActivity host,
// so this extends FlutterFragmentActivity rather than FlutterActivity.
class MainActivity : FlutterFragmentActivity() {
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(
            flutterEngine.dartExecutor.binaryMessenger,
            "com.methaltech.sacco_staff_app/app_info",
        ).setMethodCallHandler { call, result ->
            if (call.method != "getBuildNumber") {
                result.notImplemented()
                return@setMethodCallHandler
            }
            val packageInfo = packageManager.getPackageInfo(packageName, 0)
            val versionCode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                packageInfo.longVersionCode
            } else {
                @Suppress("DEPRECATION")
                packageInfo.versionCode.toLong()
            }
            result.success(versionCode)
        }
    }
}
