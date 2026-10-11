package com.sawtify.gateway

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.telecom.TelecomManager
import android.telephony.PhoneStateListener
import android.telephony.SmsManager
import android.telephony.SubscriptionManager
import android.telephony.TelephonyCallback
import android.telephony.TelephonyManager
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.atomic.AtomicBoolean

class GatewayForegroundService : Service(), GatewaySocketClient.Listener {
    companion object {
        const val ACTION_START = "com.sawtify.gateway.START"
        const val ACTION_INBOUND_SMS = "com.sawtify.gateway.INBOUND_SMS"
        const val ACTION_SMS_SENT_RESULT = "com.sawtify.gateway.SMS_SENT_RESULT"
        const val EXTRA_SERVER_URL = "server_url"
        const val EXTRA_PAIRING_TOKEN = "pairing_token"
        const val EXTRA_DEVICE_KEY = "device_key"
        const val EXTRA_DEVICE_ID = "device_id"
        const val EXTRA_DEVICE_NAME = "device_name"
        const val EXTRA_SIM_SLOT = "sim_slot"
        const val EXTRA_JOB_ID = "job_id"
        const val EXTRA_SMS_COUNT = "sms_count"
        private const val CHANNEL_ID = "sawtify_gateway_status"
        private const val NOTIFICATION_ID = 8304
        private const val TELEMETRY_INTERVAL_MS = 15_000L
        @Volatile internal var activeService: GatewayForegroundService? = null
    }

    private val handler = Handler(Looper.getMainLooper())
    private val started = AtomicBoolean(false)
    private lateinit var secrets: GatewaySecrets
    private var socketClient: GatewaySocketClient? = null
    private var audioRelay: AudioPcmRelay? = null
    private var deviceId = ""
    private var deviceName = "Sawtify Gateway"
    private var activeCallJobId: String? = null
    private var activeCallStartedAt = 0L
    private var currentCallDirection: String? = null
    private var currentCallWasActive = false
    private var activeCallSimSlot: String? = null
    private val smsPartLock = Any()
    private val smsPartResults = mutableMapOf<String, MutableMap<Int, Boolean>>()
    private var reconnectAttempt = 0
    private var reconnectRunnable: Runnable? = null
    private var phoneStateListener: PhoneStateListener? = null
    private var telephonyCallback: TelephonyCallback? = null

    private val telemetryRunnable = object : Runnable {
        override fun run() {
            if (!started.get()) return
            collectTelemetry()
            handler.postDelayed(this, TELEMETRY_INTERVAL_MS)
        }
    }

    override fun onCreate() {
        super.onCreate()
        secrets = GatewaySecrets(this)
        activeService = this
        createNotificationChannel()
        startPhoneStateMonitor()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_INBOUND_SMS) {
            socketClient?.sendSmsEvent("inbound", "received", intent.getStringExtra(EXTRA_SIM_SLOT))
            return START_STICKY
        }
        if (intent?.action == ACTION_SMS_SENT_RESULT) {
            val jobId = intent.getStringExtra(EXTRA_JOB_ID).orEmpty()
            val simSlot = intent.getStringExtra(EXTRA_SIM_SLOT)
            val sent = intent.getBooleanExtra("sent", false)
            if (jobId.isNotBlank()) {
                socketClient?.sendJobResult(jobId, if (sent) "completed" else "failed", if (sent) null else "SMS_SEND_FAILED", simSlot)
                socketClient?.sendSmsEvent("outbound", if (sent) "sent" else "failed", simSlot)
            }
            return START_STICKY
        }

        val serverUrl = intent?.getStringExtra(EXTRA_SERVER_URL).orEmpty().ifBlank { secrets.serverUrl }
        val pairingToken = intent?.getStringExtra(EXTRA_PAIRING_TOKEN).orEmpty().ifBlank { secrets.pairingToken }
        val deviceKey = intent?.getStringExtra(EXTRA_DEVICE_KEY).orEmpty().ifBlank { secrets.deviceKey }
        deviceId = intent?.getStringExtra(EXTRA_DEVICE_ID).orEmpty().ifBlank { secrets.deviceId }
        deviceName = intent?.getStringExtra(EXTRA_DEVICE_NAME).orEmpty().ifBlank { "Sawtify · ${Build.MODEL.take(45)}" }

        if (serverUrl.isBlank() || (pairingToken.isBlank() && deviceKey.isBlank())) {
            stopSelf()
            return START_NOT_STICKY
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            stopSelf()
            return START_NOT_STICKY
        }
        secrets.serverUrl = serverUrl
        if (deviceId.isNotBlank()) secrets.deviceId = deviceId
        startForeground(NOTIFICATION_ID, buildNotification("Connecting securely…"))
        if (started.compareAndSet(false, true)) {
            connect(serverUrl, pairingToken, deviceKey)
            collectTelemetry()
            handler.postDelayed(telemetryRunnable, TELEMETRY_INTERVAL_MS)
        }
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun connect(serverUrl: String, pairingToken: String, deviceKey: String) {
        runCatching { socketClient?.close() }
        socketClient = try {
            GatewaySocketClient(serverUrl, pairingToken, deviceKey, deviceId, deviceName, this).also { it.connect() }
        } catch (error: Exception) {
            Log.e("SawtifyGateway", "Invalid secure WebSocket URL", error)
            scheduleReconnect()
            null
        }
    }

    override fun onPaired(deviceKey: String, gatewayId: String) {
        secrets.deviceKey = deviceKey
        secrets.pairingToken = ""
        reconnectAttempt = 0
        updateNotification("Paired · connected to Sawtify")
        collectTelemetry()
        Log.i("SawtifyGateway", "Paired gateway $gatewayId")
    }

    override fun onAuthenticated(gatewayId: String) {
        reconnectAttempt = 0
        updateNotification("Secure relay connected")
        collectTelemetry()
        Log.i("SawtifyGateway", "Authenticated gateway $gatewayId")
    }

    override fun onCommand(command: JSONObject) {
        val id = command.optString("id")
        val action = command.optString("action")
        val expiresAt = command.optString("expires_at")
        val expiryMillis = runCatching { java.time.Instant.parse(expiresAt).toEpochMilli() }.getOrNull()
        if (id.isBlank() || expiryMillis == null || expiryMillis < System.currentTimeMillis()) {
            if (id.isNotBlank()) socketClient?.sendJobResult(id, "failed", "COMMAND_EXPIRED")
            return
        }
        val payload = command.optJSONObject("payload") ?: JSONObject()
        when (action) {
            "telephony.place_call" -> placeCall(id, payload)
            "sms.send" -> sendSms(id, payload)
            "audio.capture.start" -> startAudioCapture(id)
            "audio.capture.stop" -> {
                audioRelay?.stopCapture()
                socketClient?.sendJobResult(id, "completed")
            }
            else -> socketClient?.sendJobResult(id, "failed", "UNSUPPORTED_ACTION")
        }
    }

    override fun onAudioOutput(pcm: ByteArray) {
        audioRelay?.playOutputPcm(pcm)
    }

    override fun onServerWarning(message: String) {
        Log.w("SawtifyGateway", message)
        if (started.get()) updateNotification("Connected · service warning")
    }

    override fun onDisconnected(message: String) {
        val lowerMessage = message.lowercase()
        if (listOf("revoked", "invalid device key", "pairing token expired", "pairing token used", "invalid pairing").any { lowerMessage.contains(it) }) {
            secrets.clearPairing()
            started.set(false)
            handler.post {
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
            }
            return
        }
        updateNotification("Reconnecting · $message")
        scheduleReconnect()
    }

    private fun placeCall(jobId: String, payload: JSONObject) {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CALL_PHONE) != PackageManager.PERMISSION_GRANTED) {
            socketClient?.sendJobResult(jobId, "failed", "CALL_PHONE_PERMISSION_REQUIRED")
            return
        }
        val destination = payload.optString("destination")
        if (!destination.matches(Regex("^\\+[1-9][0-9]{7,14}$"))) {
            socketClient?.sendJobResult(jobId, "failed", "INVALID_DESTINATION")
            return
        }
        val simSlot = payload.optString("sim_slot").takeIf { it == "0" || it == "1" }
        try {
            val telecomManager = getSystemService(TelecomManager::class.java)
            val extras = Bundle()
            if (simSlot != null) {
                val subscriptionId = subscriptionForSlot(simSlot.toInt())
                if (subscriptionId == null) {
                    socketClient?.sendJobResult(jobId, "failed", "SIM_SLOT_UNAVAILABLE", simSlot)
                    return
                }
                val phoneAccount = telecomManager.callCapablePhoneAccounts.firstOrNull { it.id == subscriptionId.toString() }
                if (phoneAccount == null) {
                    socketClient?.sendJobResult(jobId, "failed", "SIM_CALL_ACCOUNT_UNAVAILABLE", simSlot)
                    return
                }
                extras.putParcelable(TelecomManager.EXTRA_PHONE_ACCOUNT_HANDLE, phoneAccount)
            }
            socketClient?.sendJobResult(jobId, "accepted", simSlot = simSlot)
            activeCallJobId = jobId
            activeCallStartedAt = System.currentTimeMillis()
            currentCallDirection = "outbound"
            currentCallWasActive = false
            activeCallSimSlot = simSlot
            telecomManager.placeCall(Uri.fromParts("tel", destination, null), extras)
        } catch (error: SecurityException) {
            clearActiveCall()
            socketClient?.sendJobResult(jobId, "failed", "CALL_PERMISSION_OR_DEVICE_RESTRICTION", simSlot)
        } catch (error: Exception) {
            clearActiveCall()
            socketClient?.sendJobResult(jobId, "failed", "CALL_START_FAILED", simSlot)
            Log.w("SawtifyGateway", "Call could not be started", error)
        }
    }

    private fun clearActiveCall() {
        activeCallJobId = null
        activeCallStartedAt = 0L
        currentCallDirection = null
        currentCallWasActive = false
        activeCallSimSlot = null
    }

    private fun sendSms(jobId: String, payload: JSONObject) {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.SEND_SMS) != PackageManager.PERMISSION_GRANTED) {
            socketClient?.sendJobResult(jobId, "failed", "SEND_SMS_PERMISSION_REQUIRED")
            return
        }
        val destination = payload.optString("destination")
        val message = payload.optString("message")
        if (!destination.matches(Regex("^\\+[1-9][0-9]{7,14}$")) || message.isBlank() || message.length > 320) {
            socketClient?.sendJobResult(jobId, "failed", "INVALID_SMS_PAYLOAD")
            return
        }
        val simSlot = payload.optString("sim_slot").takeIf { it == "0" || it == "1" }
        try {
            val subscriptionId = simSlot?.let { subscriptionForSlot(it.toInt()) }
            if (simSlot != null && subscriptionId == null) {
                socketClient?.sendJobResult(jobId, "failed", "SIM_SLOT_UNAVAILABLE", simSlot)
                return
            }
            val manager = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && subscriptionId != null) {
                getSystemService(SmsManager::class.java).createForSubscriptionId(subscriptionId)
            } else if (subscriptionId != null) {
                @Suppress("DEPRECATION")
                SmsManager.getSmsManagerForSubscriptionId(subscriptionId)
            } else {
                getSystemService(SmsManager::class.java)
            }
            val parts = manager.divideMessage(message)
            if (parts.isEmpty()) {
                socketClient?.sendJobResult(jobId, "failed", "INVALID_SMS_PAYLOAD", simSlot)
                return
            }
            val sentIntents = ArrayList<PendingIntent>(parts.size)
            parts.forEachIndexed { index, _ ->
                sentIntents += PendingIntent.getBroadcast(
                    this,
                    jobId.hashCode() + index,
                    Intent(this, SmsSendResultReceiver::class.java)
                        .setAction(ACTION_SMS_SENT_RESULT)
                        .putExtra(EXTRA_JOB_ID, jobId)
                        .putExtra(EXTRA_SIM_SLOT, simSlot)
                        .putExtra("part_index", index)
                        .putExtra("part_count", parts.size),
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
                )
            }
            socketClient?.sendJobResult(jobId, "accepted", simSlot = simSlot)
            manager.sendMultipartTextMessage(destination, null, parts, sentIntents, null)
        } catch (error: SecurityException) {
            socketClient?.sendJobResult(jobId, "failed", "SEND_SMS_PERMISSION_REQUIRED", simSlot)
        } catch (error: Exception) {
            socketClient?.sendJobResult(jobId, "failed", "SMS_SEND_FAILED", simSlot)
            Log.w("SawtifyGateway", "SMS could not be sent", error)
        }
    }

    private fun startAudioCapture(jobId: String) {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            socketClient?.sendJobResult(jobId, "failed", "RECORD_AUDIO_PERMISSION_REQUIRED")
            return
        }
        try {
            if (audioRelay == null) audioRelay = AudioPcmRelay { frame -> socketClient?.sendAudioFrame(frame) }
            audioRelay?.startCapture()
            socketClient?.sendJobResult(jobId, "running")
        } catch (error: Exception) {
            socketClient?.sendJobResult(jobId, "failed", "AUDIO_CAPTURE_UNAVAILABLE")
            Log.w("SawtifyGateway", "PCM capture could not start", error)
        }
    }

    private fun collectTelemetry() {
        val batteryIntent = registerReceiver(null, android.content.IntentFilter(Intent.ACTION_BATTERY_CHANGED))
        val level = batteryIntent?.getIntExtra("level", -1) ?: -1
        val scale = batteryIntent?.getIntExtra("scale", -1) ?: -1
        val battery = if (level >= 0 && scale > 0) (level * 100 / scale).coerceIn(0, 100) else null
        val hasPhonePermission = ContextCompat.checkSelfPermission(this, Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED
        val simArray = JSONArray()
        var activeSlot: String? = null
        var networkState = "unknown"
        var signalPercent: Int? = null
        if (hasPhonePermission) {
            try {
                val subscriptionManager = getSystemService(SubscriptionManager::class.java)
                val subscriptions = subscriptionManager.activeSubscriptionInfoList.orEmpty().take(2)
                val defaultData = SubscriptionManager.getDefaultDataSubscriptionId()
                for (subscription in subscriptions) {
                    val slot = subscription.simSlotIndex
                    if (slot !in 0..1) continue
                    val telephony = getSystemService(TelephonyManager::class.java).createForSubscriptionId(subscription.subscriptionId)
                    val ready = telephony.simState == TelephonyManager.SIM_STATE_READY
                    val state = if (!ready) "disabled" else {
                        val inService = if (Build.VERSION.SDK_INT >= 31) {
                            runCatching { telephony.serviceState?.state == android.telephony.ServiceState.STATE_IN_SERVICE }.getOrNull()
                        } else null
                        when (inService) { true -> "ready"; false -> "no_service"; null -> "unknown" }
                    }
                    simArray.put(JSONObject()
                        .put("slot", slot.toString())
                        .put("operator", subscription.carrierName?.toString()?.take(40).orEmpty())
                        .put("state", state))
                    if (subscription.subscriptionId == defaultData) activeSlot = slot.toString()
                    if (networkState == "unknown" && state != "unknown") networkState = if (state == "ready") "connected" else "no_service"
                    if (signalPercent == null && Build.VERSION.SDK_INT >= 31) {
                        signalPercent = runCatching { telephony.signalStrength?.level?.let { (it.coerceIn(0, 4) * 25) } }.getOrNull()
                    }
                }
                if (subscriptions.isEmpty()) networkState = "no_service"
            } catch (error: SecurityException) {
                Log.d("SawtifyGateway", "Phone state permission was revoked", error)
            } catch (error: Exception) {
                Log.d("SawtifyGateway", "SIM telemetry unavailable", error)
            }
        }
        val capabilities = JSONObject()
            .put("outbound_call", ContextCompat.checkSelfPermission(this, Manifest.permission.CALL_PHONE) == PackageManager.PERMISSION_GRANTED)
            .put("inbound_call", hasPhonePermission)
            .put("sms_send", ContextCompat.checkSelfPermission(this, Manifest.permission.SEND_SMS) == PackageManager.PERMISSION_GRANTED)
            .put("sms_receive", ContextCompat.checkSelfPermission(this, Manifest.permission.RECEIVE_SMS) == PackageManager.PERMISSION_GRANTED)
            .put("pcm_audio", ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED)
        socketClient?.sendTelemetry(battery, networkState, signalPercent, activeSlot, simArray, capabilities)
    }

    private fun subscriptionForSlot(slot: Int): Int? {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_PHONE_STATE) != PackageManager.PERMISSION_GRANTED) return null
        return runCatching {
            getSystemService(SubscriptionManager::class.java).activeSubscriptionInfoList
                ?.firstOrNull { it.simSlotIndex == slot }?.subscriptionId
        }.getOrNull()
    }

    private fun startPhoneStateMonitor() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_PHONE_STATE) != PackageManager.PERMISSION_GRANTED) return
        try {
            val manager = getSystemService(TelephonyManager::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val callback = object : TelephonyCallback(), TelephonyCallback.CallStateListener {
                    override fun onCallStateChanged(state: Int) = sendCallState(state)
                }
                manager.registerTelephonyCallback(mainExecutor, callback)
                telephonyCallback = callback
            } else {
                @Suppress("DEPRECATION")
                val listener = object : PhoneStateListener() {
                    override fun onCallStateChanged(state: Int, phoneNumber: String?) = sendCallState(state)
                }
                @Suppress("DEPRECATION")
                manager.listen(listener, PhoneStateListener.LISTEN_CALL_STATE)
                phoneStateListener = listener
            }
        } catch (error: Exception) {
            Log.w("SawtifyGateway", "Call state monitor unavailable", error)
        }
    }

    private fun sendCallState(state: Int) {
        val slot = activeCallSimSlot
        when (state) {
            TelephonyManager.CALL_STATE_RINGING -> {
                currentCallDirection = "inbound"
                currentCallWasActive = false
                socketClient?.sendCallEvent("inbound", "ringing", slot)
            }
            TelephonyManager.CALL_STATE_OFFHOOK -> {
                if (currentCallDirection == null) currentCallDirection = "unknown"
                currentCallWasActive = true
                socketClient?.sendCallEvent(currentCallDirection ?: "unknown", "active", slot)
                activeCallJobId?.let { socketClient?.sendJobResult(it, "running", simSlot = slot) }
            }
            TelephonyManager.CALL_STATE_IDLE -> {
                val direction = currentCallDirection
                if (direction != null) {
                    val callState = if (currentCallWasActive) "ended" else if (direction == "inbound") "missed" else "rejected"
                    socketClient?.sendCallEvent(direction, callState, slot)
                    val jobId = activeCallJobId
                    if (jobId != null) {
                        val elapsedSeconds = ((System.currentTimeMillis() - activeCallStartedAt) / 1000L).coerceAtLeast(0)
                        socketClient?.sendJobResult(jobId, if (currentCallWasActive) "completed" else "failed", if (currentCallWasActive) null else "CALL_NOT_CONNECTED", slot, elapsedSeconds.toInt())
                    }
                }
                activeCallJobId = null
                activeCallStartedAt = 0L
                currentCallDirection = null
                currentCallWasActive = false
                activeCallSimSlot = null
            }
        }
    }

    private fun scheduleReconnect() {
        if (!started.get() || reconnectRunnable != null) return
        val delay = (2_000L shl reconnectAttempt.coerceAtMost(4)).coerceAtMost(30_000L)
        reconnectAttempt += 1
        reconnectRunnable = Runnable {
            reconnectRunnable = null
            if (!started.get()) return@Runnable
            connect(secrets.serverUrl, secrets.pairingToken, secrets.deviceKey)
        }.also { handler.postDelayed(it, delay) }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(CHANNEL_ID, "Sawtify Gateway", NotificationManager.IMPORTANCE_LOW).apply {
                description = "Persistent status for the Sawtify GSM relay"
                setShowBadge(false)
            }
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }

    private fun buildNotification(text: String): Notification {
        val openApp = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_gateway_notification)
            .setContentTitle("Sawtify Gateway")
            .setContentText(text.take(100))
            .setContentIntent(openApp)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build()
    }

    private fun updateNotification(text: String) {
        if (!started.get()) return
        getSystemService(NotificationManager::class.java).notify(NOTIFICATION_ID, buildNotification(text))
    }

    internal fun reportInboundSms(simSlot: String?) {
        socketClient?.sendSmsEvent("inbound", "received", simSlot)
    }

    internal fun reportSmsResult(intent: Intent) {
        val jobId = intent.getStringExtra(EXTRA_JOB_ID).orEmpty()
        val simSlot = intent.getStringExtra(EXTRA_SIM_SLOT)
        val sent = intent.getBooleanExtra("sent", false)
        val partIndex = intent.getIntExtra("part_index", 0)
        val partCount = intent.getIntExtra("part_count", 1).coerceIn(1, 10)
        if (jobId.isBlank()) return
        var finalResult: Boolean? = null
        synchronized(smsPartLock) {
            val parts = smsPartResults.getOrPut(jobId) { mutableMapOf() }
            parts[partIndex] = sent
            if (parts.size >= partCount) {
                finalResult = parts.values.all { it }
                smsPartResults.remove(jobId)
            }
        }
        val completed = finalResult ?: return
        socketClient?.sendJobResult(jobId, if (completed) "completed" else "failed", if (completed) null else "SMS_SEND_FAILED", simSlot)
        socketClient?.sendSmsEvent("outbound", if (completed) "sent" else "failed", simSlot)
    }

    override fun onDestroy() {
        started.set(false)
        activeService = null
        handler.removeCallbacks(telemetryRunnable)
        reconnectRunnable?.let(handler::removeCallbacks)
        reconnectRunnable = null
        runCatching { socketClient?.close() }
        socketClient = null
        audioRelay?.release()
        audioRelay = null
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                telephonyCallback?.let { getSystemService(TelephonyManager::class.java).unregisterTelephonyCallback(it) }
            } else {
                @Suppress("DEPRECATION")
                phoneStateListener?.let { getSystemService(TelephonyManager::class.java).listen(it, PhoneStateListener.LISTEN_NONE) }
            }
        } catch (_: Exception) {
        }
        super.onDestroy()
    }
}

class InboundSmsReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECEIVE_SMS) != PackageManager.PERMISSION_GRANTED) return
        // The SMS content, sender number, and SIM serial identifiers are deliberately never parsed or uploaded.
        val slot = intent.getIntExtra(SubscriptionManager.EXTRA_SUBSCRIPTION_INDEX, -1).takeIf { it in 0..1 }?.toString()
        GatewayForegroundService.activeService?.reportInboundSms(slot)
    }
}

class SmsSendResultReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val result = Intent(intent).putExtra("sent", resultCode == android.app.Activity.RESULT_OK)
        GatewayForegroundService.activeService?.reportSmsResult(result)
    }
}

