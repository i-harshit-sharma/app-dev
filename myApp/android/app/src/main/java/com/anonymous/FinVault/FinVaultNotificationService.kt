package com.anonymous.FinVault

import android.app.Notification
import android.content.Intent
import android.content.pm.PackageManager
import android.provider.Telephony
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import androidx.localbroadcastmanager.content.LocalBroadcastManager
import org.json.JSONObject

class FinVaultNotificationService : NotificationListenerService() {

    override fun onCreate() {
        super.onCreate()
        NotificationHolder.setService(this)
    }

    override fun onDestroy() {
        NotificationHolder.setService(null)
        super.onDestroy()
    }

    companion object {
        const val ACTION_NOTIFICATION_POSTED = "com.anonymous.FinVault.NOTIFICATION_POSTED"
        const val ACTION_NOTIFICATION_REMOVED = "com.anonymous.FinVault.NOTIFICATION_REMOVED"
        const val EXTRA_NOTIFICATION_DATA = "notification_data"

        // Common SMS app package IDs used as fallback when default SMS app lookup is unavailable.
        private val KNOWN_SMS_PACKAGES = setOf(
            "com.google.android.apps.messaging",
            "com.android.mms",
            "com.samsung.android.messaging",
            "com.microsoft.android.smsorganizer",
            "com.miui.securitycenter",
            "com.coloros.mms"
        )
    }

    private fun isSmsPackage(packageName: String): Boolean {
        val defaultSmsPackage = try {
            Telephony.Sms.getDefaultSmsPackage(this)
        } catch (_: Exception) {
            null
        }

        if (!defaultSmsPackage.isNullOrBlank() && packageName == defaultSmsPackage) {
            return true
        }

        return KNOWN_SMS_PACKAGES.contains(packageName)
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        if (!isSmsPackage(sbn.packageName)) return
        val data = buildNotificationJson(sbn) ?: return
        val intent = Intent(ACTION_NOTIFICATION_POSTED).apply {
            putExtra(EXTRA_NOTIFICATION_DATA, data.toString())
        }
        LocalBroadcastManager.getInstance(this).sendBroadcast(intent)
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification) {
        if (!isSmsPackage(sbn.packageName)) return
        val intent = Intent(ACTION_NOTIFICATION_REMOVED).apply {
            putExtra(EXTRA_NOTIFICATION_DATA, sbn.key)
        }
        LocalBroadcastManager.getInstance(this).sendBroadcast(intent)
    }

    private fun buildNotificationJson(sbn: StatusBarNotification): JSONObject? {
        return try {
            if (!isSmsPackage(sbn.packageName)) return null

            val notification = sbn.notification ?: return null
            val extras = notification.extras ?: return null

            val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
            val text = (extras.getCharSequence(Notification.EXTRA_BIG_TEXT)
                ?: extras.getCharSequence(Notification.EXTRA_TEXT))?.toString() ?: ""

            // Skip empty or system notifications we don't care about
            if (title.isEmpty() && text.isEmpty()) return null

            // Get app label from package name
            val pm: PackageManager = packageManager
            val appName = try {
                val appInfo = pm.getApplicationInfo(sbn.packageName, 0)
                pm.getApplicationLabel(appInfo).toString()
            } catch (e: Exception) {
                sbn.packageName
            }

            JSONObject().apply {
                put("id", sbn.key)
                put("packageName", sbn.packageName)
                put("appName", appName)
                put("title", title)
                put("text", text)
                put("timestamp", sbn.postTime)
                put("isOngoing", notification.flags and Notification.FLAG_ONGOING_EVENT != 0)
            }
        } catch (e: Exception) {
            null
        }
    }

    fun getActiveNotificationsJson(): String {
        return try {
            val list = activeNotifications ?: return "[]"
            val jsonArray = StringBuilder("[")
            var first = true
            for (sbn in list) {
                val json = buildNotificationJson(sbn) ?: continue
                if (!first) jsonArray.append(",")
                jsonArray.append(json.toString())
                first = false
            }
            jsonArray.append("]")
            jsonArray.toString()
        } catch (e: Exception) {
            "[]"
        }
    }
}
