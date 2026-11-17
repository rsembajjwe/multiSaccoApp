package com.methaltech.sacco_member_app

import android.Manifest
import android.content.pm.PackageManager
import android.provider.ContactsContract
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import io.flutter.embedding.android.FlutterFragmentActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel

// local_auth (biometric unlock) requires a FragmentActivity host,
// so this extends FlutterFragmentActivity rather than FlutterActivity.
class MainActivity : FlutterFragmentActivity() {
    private val channelName = "com.methaltech.tereka/contacts"
    private val contactsPermissionRequest = 4102
    private var pendingContactsResult: MethodChannel.Result? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, channelName)
            .setMethodCallHandler { call, result -> handleMethod(call, result) }
    }

    private fun handleMethod(call: MethodCall, result: MethodChannel.Result) {
        if (call.method != "getPhoneContacts") {
            result.notImplemented()
            return
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_CONTACTS) == PackageManager.PERMISSION_GRANTED) {
            result.success(readPhoneContacts())
            return
        }
        pendingContactsResult = result
        ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.READ_CONTACTS), contactsPermissionRequest)
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode != contactsPermissionRequest) return
        val result = pendingContactsResult ?: return
        pendingContactsResult = null
        if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            result.success(readPhoneContacts())
        } else {
            result.error("CONTACT_PERMISSION_DENIED", "Contact permission was denied. Enable it in phone settings to select recipients.", null)
        }
    }

    private fun readPhoneContacts(): List<Map<String, String>> {
        val contacts = mutableListOf<Map<String, String>>()
        val projection = arrayOf(
            ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
            ContactsContract.CommonDataKinds.Phone.NUMBER
        )
        contentResolver.query(
            ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
            projection,
            null,
            null,
            ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME + " ASC"
        )?.use { cursor ->
            val nameIndex = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME)
            val phoneIndex = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER)
            while (cursor.moveToNext()) {
                val name = if (nameIndex >= 0) cursor.getString(nameIndex) else "Contact"
                val phone = if (phoneIndex >= 0) cursor.getString(phoneIndex) else ""
                if (!phone.isNullOrBlank()) contacts.add(mapOf("name" to (name ?: "Contact"), "phone" to phone))
            }
        }
        return contacts
    }
}
