import Flutter
import UIKit

@main
@objc class AppDelegate: FlutterAppDelegate, FlutterImplicitEngineDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  func didInitializeImplicitFlutterEngine(_ engineBridge: FlutterImplicitEngineBridge) {
    GeneratedPluginRegistrant.register(with: engineBridge.pluginRegistry)
    let registrar = engineBridge.pluginRegistry.registrar(forPlugin: "StaffAppInfo")
    let channel = FlutterMethodChannel(
      name: "com.methaltech.sacco_staff_app/app_info",
      binaryMessenger: registrar.messenger()
    )
    channel.setMethodCallHandler { call, result in
      guard call.method == "getBuildNumber" else {
        result(FlutterMethodNotImplemented)
        return
      }
      let buildNumber = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String
      result(Int(buildNumber ?? "0") ?? 0)
    }
  }
}
