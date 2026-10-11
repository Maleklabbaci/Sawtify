package com.sawtify.gateway

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.ComponentActivity
import androidx.core.content.ContextCompat
import java.net.URI
import java.util.UUID

class MainActivity : ComponentActivity() {
    private lateinit var secrets: GatewaySecrets
    private lateinit var statusText: TextView

    private val permissionRequest = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { grants ->
        val requiredMissing = permissionsToRequest().filter { permission ->
            permission != Manifest.permission.POST_NOTIFICATIONS && grants[permission] != true &&
                ContextCompat.checkSelfPermission(this, permission) != PackageManager.PERMISSION_GRANTED
        }
        if (requiredMissing.isNotEmpty()) {
            statusText.text = "Some gateway features remain disabled until permissions are granted."
        }
        startGatewayService()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        secrets = GatewaySecrets(this)
        receivePairingLink(intent)
        buildScreen()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        receivePairingLink(intent)
        refreshStatus()
    }

    private fun buildScreen() {
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(36, 48, 36, 32)
            setBackgroundColor(0xFFF7F5FC.toInt())
        }
        val title = TextView(this).apply {
            text = "Sawtify Gateway"
            textSize = 25f
            setTextColor(0xFF28164A.toInt())
            gravity = Gravity.CENTER
            typeface = android.graphics.Typeface.DEFAULT_BOLD
        }
        statusText = TextView(this).apply {
            textSize = 14f
            setTextColor(0xFF475569.toInt())
            gravity = Gravity.CENTER
            setPadding(0, 24, 0, 18)
        }
        val startButton = Button(this).apply {
            text = "Start secure relay"
            setOnClickListener { requestPermissionsAndStart() }
        }
        val stopButton = Button(this).apply {
            text = "Stop relay"
            setOnClickListener {
                stopService(Intent(this@MainActivity, GatewayForegroundService::class.java))
                statusText.text = "Relay stopped."
            }
        }
        val note = TextView(this).apply {
            text = "Keep this phone powered and connected. Calls, microphone audio and SMS require Android permissions and may be restricted by the device or mobile operator. No SMS content is uploaded by this app."
            textSize = 12f
            setTextColor(0xFF64748B.toInt())
            gravity = Gravity.CENTER
            setPadding(0, 22, 0, 0)
        }
        root.addView(title, matchWidth())
        root.addView(statusText, matchWidth())
        root.addView(startButton, matchWidth())
        root.addView(stopButton, matchWidth())
        root.addView(note, matchWidth())
        setContentView(root)
        refreshStatus()
    }

    private fun matchWidth() = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)

    private fun refreshStatus() {
        val host = runCatching { URI(secrets.serverUrl).host }.getOrNull()
        val paired = secrets.deviceKey.isNotBlank()
        statusText.text = when {
            secrets.serverUrl.isBlank() -> "Scan the temporary pairing QR from Agent Sawtify."
            paired -> "Device paired with ${host ?: "Sawtify"}. Start the foreground relay when ready."
            secrets.pairingToken.isNotBlank() -> "Pairing token saved for ${host ?: "Sawtify"}. Start the relay to claim this device."
            else -> "No pairing token. Scan a new QR from the merchant dashboard."
        }
    }

    private fun receivePairingLink(intent: Intent?) {
        val uri: Uri = intent?.data ?: return
        if (uri.scheme != "sawtify-gateway" || uri.host != "pair") return
        val server = uri.getQueryParameter("server")?.trimEnd('/') ?: return
        val token = uri.getQueryParameter("token") ?: return
        val parsed = runCatching { URI(server) }.getOrNull()
        if (parsed == null || parsed.scheme != "https" || parsed.host.isNullOrBlank() || token.length < 32) {
            Toast.makeText(this, "Invalid or insecure pairing link.", Toast.LENGTH_LONG).show()
            return
        }
        stopService(Intent(this, GatewayForegroundService::class.java))
        secrets.serverUrl = server
        secrets.pairingToken = token
        secrets.deviceKey = ""
        secrets.deviceId = UUID.randomUUID().toString()
        Toast.makeText(this, "Temporary pairing token received.", Toast.LENGTH_SHORT).show()
    }

    private fun permissionsToRequest(): Array<String> = buildList {
        add(Manifest.permission.RECORD_AUDIO)
        add(Manifest.permission.READ_PHONE_STATE)
        add(Manifest.permission.CALL_PHONE)
        add(Manifest.permission.SEND_SMS)
        add(Manifest.permission.RECEIVE_SMS)
        if (Build.VERSION.SDK_INT >= 33) add(Manifest.permission.POST_NOTIFICATIONS)
    }.toTypedArray()

    private fun requestPermissionsAndStart() {
        if (secrets.serverUrl.isBlank() || (secrets.deviceKey.isBlank() && secrets.pairingToken.isBlank())) {
            statusText.text = "Scan a valid temporary pairing QR first."
            return
        }
        val missing = permissionsToRequest().filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        if (missing.isEmpty()) startGatewayService() else permissionRequest.launch(missing.toTypedArray())
    }

    private fun startGatewayService() {
        if (secrets.deviceId.isBlank()) secrets.deviceId = UUID.randomUUID().toString()
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            statusText.text = "Microphone permission is required before the audio relay can start."
            return
        }
        val intent = Intent(this, GatewayForegroundService::class.java).apply {
            action = GatewayForegroundService.ACTION_START
            putExtra(GatewayForegroundService.EXTRA_SERVER_URL, secrets.serverUrl)
            putExtra(GatewayForegroundService.EXTRA_PAIRING_TOKEN, secrets.pairingToken)
            putExtra(GatewayForegroundService.EXTRA_DEVICE_KEY, secrets.deviceKey)
            putExtra(GatewayForegroundService.EXTRA_DEVICE_ID, secrets.deviceId.ifBlank { UUID.randomUUID().toString() })
            putExtra(GatewayForegroundService.EXTRA_DEVICE_NAME, "Sawtify · ${Build.MODEL.take(45)}")
        }
        ContextCompat.startForegroundService(this, intent)
        statusText.text = "Secure relay starting. Keep the Sawtify notification visible."
    }
}
