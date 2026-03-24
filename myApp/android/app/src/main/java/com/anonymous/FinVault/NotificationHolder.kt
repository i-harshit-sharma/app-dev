package com.anonymous.FinVault

/**
 * Static holder used by NotificationModule to retrieve active notifications
 * from the running FinVaultNotificationService without a direct service binding.
 */
object NotificationHolder {
    @Volatile
    private var serviceInstance: FinVaultNotificationService? = null

    fun setService(service: FinVaultNotificationService?) {
        serviceInstance = service
    }

    fun getNotifications(): String {
        return serviceInstance?.getActiveNotificationsJson() ?: "[]"
    }
}
