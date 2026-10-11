package com.sawtify.gateway

import android.util.Base64
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import org.json.JSONArray
import org.json.JSONObject
import java.net.URI
import java.util.concurrent.TimeUnit

internal class GatewaySocketClient(
    serverUrl: String,
    private val pairingToken: String,
    private val deviceKey: String,
    private val deviceId: String,
    private val deviceName: String,
    private val listener: Listener,
) {
    interface Listener {
        fun onPaired(deviceKey: String, gatewayId: String)
        fun onAuthenticated(gatewayId: String)
        fun onCommand(command: JSONObject)
        fun onAudioOutput(pcm: ByteArray)
        fun onServerWarning(message: String)
        fun onDisconnected(message: String)
    }

    private val client = OkHttpClient.Builder()
        .pingInterval(25, TimeUnit.SECONDS)
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .build()
    private val socketUrl = toSocketUrl(serverUrl)
    @Volatile private var webSocket: WebSocket? = null

    private fun toSocketUrl(base: String): String {
        val uri = URI(base)
        require(uri.scheme == "https" && !uri.host.isNullOrBlank()) { "A secure HTTPS API URL is required." }
        return "wss://${uri.host}${if (uri.port > 0) ":${uri.port}" else ""}/api/agent/sawtify/gateway/ws"
    }

    fun connect() {
        val request = Request.Builder().url(socketUrl).build()
        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                val auth = if (deviceKey.isNotBlank()) {
                    JSONObject().put("type", "authenticate").put("device_key", deviceKey)
                } else {
                    JSONObject()
                        .put("type", "claim_pairing")
                        .put("pairing_token", pairingToken)
                        .put("device_id", deviceId)
                        .put("device_name", deviceName)
                }
                webSocket.send(auth.toString())
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                val packet = runCatching { JSONObject(text) }.getOrNull() ?: return
                when (packet.optString("type")) {
                    "paired" -> {
                        val key = packet.optString("device_key")
                        val id = packet.optString("gateway_id")
                        if (key.startsWith("swt_gw_") && id.isNotBlank()) listener.onPaired(key, id)
                    }
                    "authenticated" -> listener.onAuthenticated(packet.optString("gateway_id"))
                    "command" -> packet.optJSONObject("command")?.let(listener::onCommand)
                    "audio_output" -> {
                        val encoded = packet.optString("pcm_base64")
                        if (encoded.isNotBlank() && encoded.length <= 64_000) {
                            runCatching { Base64.decode(encoded, Base64.NO_WRAP) }.getOrNull()?.let(listener::onAudioOutput)
                        }
                    }
                    "gateway_error" -> listener.onServerWarning(packet.optString("error", "Gateway warning"))
                }
            }

            override fun onFailure(webSocket: WebSocket, error: Throwable, response: Response?) {
                listener.onDisconnected(error.message ?: "WebSocket connection failed")
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                listener.onDisconnected(reason.ifBlank { "WebSocket closed" })
            }
        })
    }

    fun sendTelemetry(
        batteryPercent: Int?,
        networkState: String,
        signalPercent: Int?,
        activeSimSlot: String?,
        simSlots: JSONArray,
        capabilities: JSONObject,
    ) {
        val packet = JSONObject()
            .put("type", "telemetry")
            .put("battery_percent", batteryPercent ?: JSONObject.NULL)
            .put("network_state", networkState)
            .put("signal_percent", signalPercent ?: JSONObject.NULL)
            .put("active_sim_slot", activeSimSlot ?: JSONObject.NULL)
            .put("sim_slots", simSlots)
            .put("capabilities", capabilities)
        send(packet)
    }

    fun sendJobResult(jobId: String, status: String, errorCode: String? = null, simSlot: String? = null, durationSeconds: Int? = null) {
        val packet = JSONObject()
            .put("type", "job_result")
            .put("job_id", jobId)
            .put("status", status)
            .put("sim_slot", simSlot ?: JSONObject.NULL)
        if (!errorCode.isNullOrBlank()) packet.put("error_code", errorCode.take(64))
        if (durationSeconds != null) packet.put("duration_seconds", durationSeconds.coerceAtLeast(0))
        send(packet)
    }

    fun sendCallEvent(direction: String, state: String, simSlot: String? = null) {
        send(JSONObject().put("type", "call_event").put("direction", direction).put("state", state).put("sim_slot", simSlot ?: JSONObject.NULL))
    }

    fun sendSmsEvent(direction: String, state: String, simSlot: String? = null) {
        send(JSONObject().put("type", "sms_event").put("direction", direction).put("state", state).put("sim_slot", simSlot ?: JSONObject.NULL))
    }

    /** PCM frames are transient and are never written to local storage. A backend live-audio bridge must be enabled to consume them. */
    fun sendAudioFrame(pcm16k: ByteArray) {
        if (pcm16k.isEmpty() || pcm16k.size > 8192) return
        val encoded = Base64.encodeToString(pcm16k, Base64.NO_WRAP)
        send(JSONObject().put("type", "audio_frame").put("sample_rate_hz", 16_000).put("encoding", "pcm_s16le").put("pcm_base64", encoded))
    }

    private fun send(packet: JSONObject) {
        webSocket?.send(packet.toString())
    }

    fun close() {
        webSocket?.close(1000, "Gateway service stopped")
        webSocket = null
        client.dispatcher.executorService.shutdown()
    }
}
