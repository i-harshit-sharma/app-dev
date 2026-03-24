package com.anonymous.FinVault

import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.provider.Settings
import android.text.TextUtils
import androidx.localbroadcastmanager.content.LocalBroadcastManager
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class NotificationModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var receiver: BroadcastReceiver? = null

    override fun getName(): String = "NotificationModule"

    override fun initialize() {
        super.initialize()
        registerReceiver()
    }

    override fun invalidate() {
        unregisterReceiver()
        super.invalidate()
    }

    private fun registerReceiver() {
        val filter = IntentFilter().apply {
            addAction(FinVaultNotificationService.ACTION_NOTIFICATION_POSTED)
            addAction(FinVaultNotificationService.ACTION_NOTIFICATION_REMOVED)
        }
        receiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                intent ?: return
                val data = intent.getStringExtra(FinVaultNotificationService.EXTRA_NOTIFICATION_DATA) ?: return
                when (intent.action) {
                    FinVaultNotificationService.ACTION_NOTIFICATION_POSTED -> sendJsEvent("onNotificationPosted", data)
                    FinVaultNotificationService.ACTION_NOTIFICATION_REMOVED -> sendJsEvent("onNotificationRemoved", data)
                }
            }
        }
        LocalBroadcastManager.getInstance(reactContext).registerReceiver(receiver!!, filter)
    }

    private fun unregisterReceiver() {
        receiver?.let {
            LocalBroadcastManager.getInstance(reactContext).unregisterReceiver(it)
            receiver = null
        }
    }

    private fun sendJsEvent(eventName: String, data: String) {
        try {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit(eventName, data)
        } catch (e: Exception) {
            // ignore if JS side not ready
        }
    }

    @ReactMethod
    fun hasNotificationPermission(promise: Promise) {
        try {
            val enabled = isNotificationListenerEnabled()
            promise.resolve(enabled)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun openNotificationSettings(promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            reactContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun getActiveNotifications(promise: Promise) {
        try {
            if (!isNotificationListenerEnabled()) {
                promise.resolve("[]")
                return
            }
            // Bind to the service to get active notifications
            val cn = ComponentName(reactContext, FinVaultNotificationService::class.java)
            val flat = Settings.Secure.getString(reactContext.contentResolver, "enabled_notification_listeners")
            if (flat == null || !flat.contains(cn.flattenToString())) {
                promise.resolve("[]")
                return
            }
            // Use a static holder to get notifications from the running service
            val json = NotificationHolder.getNotifications()
            promise.resolve(json)
        } catch (e: Exception) {
            promise.resolve("[]")
        }
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for RCTEventEmitter compatibility
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for RCTEventEmitter compatibility
    }

    private fun isNotificationListenerEnabled(): Boolean {
        val cn = ComponentName(reactContext, FinVaultNotificationService::class.java)
        val flat = Settings.Secure.getString(reactContext.contentResolver, "enabled_notification_listeners")
        return flat != null && flat.contains(cn.flattenToString())
    }
}
