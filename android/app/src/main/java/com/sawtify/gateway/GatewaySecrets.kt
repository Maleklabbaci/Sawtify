package com.sawtify.gateway

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

internal class GatewaySecrets(context: Context) {
    private val preferences = EncryptedSharedPreferences.create(
        context,
        "sawtify_gateway_secrets",
        MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build(),
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )

    var serverUrl: String
        get() = preferences.getString("server_url", "") ?: ""
        set(value) = preferences.edit().putString("server_url", value).apply()

    var pairingToken: String
        get() = preferences.getString("pairing_token", "") ?: ""
        set(value) = preferences.edit().putString("pairing_token", value).apply()

    var deviceKey: String
        get() = preferences.getString("device_key", "") ?: ""
        set(value) = preferences.edit().putString("device_key", value).apply()

    var deviceId: String
        get() = preferences.getString("device_id", "") ?: ""
        set(value) = preferences.edit().putString("device_id", value).apply()

    fun clearPairing() {
        preferences.edit()
            .remove("pairing_token")
            .remove("device_key")
            .remove("device_id")
            .apply()
    }
}
