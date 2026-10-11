package com.sawtify.gateway

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.AudioTrack
import android.media.MediaRecorder
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

/** In-memory only PCM bridge. The relay does not record to disk or retain audio frames. */
internal class AudioPcmRelay(
    private val sendInputFrame: (ByteArray) -> Unit,
) {
    companion object {
        const val INPUT_SAMPLE_RATE = 16_000
        const val OUTPUT_SAMPLE_RATE = 24_000
        private const val FRAME_BYTES = 640 // 20 ms mono PCM16 at 16 kHz.
    }

    private val running = AtomicBoolean(false)
    private val playbackExecutor = Executors.newSingleThreadExecutor()
    @Volatile private var recorder: AudioRecord? = null
    @Volatile private var player: AudioTrack? = null
    @Volatile private var captureThread: Thread? = null

    fun startCapture() {
        if (!running.compareAndSet(false, true)) return
        val minimum = AudioRecord.getMinBufferSize(
            INPUT_SAMPLE_RATE,
            AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_16BIT,
        )
        if (minimum <= 0) {
            running.set(false)
            throw IllegalStateException("PCM microphone is not supported on this device.")
        }
        val audioRecord = AudioRecord(
            MediaRecorder.AudioSource.MIC,
            INPUT_SAMPLE_RATE,
            AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_16BIT,
            maxOf(minimum, FRAME_BYTES * 4),
        )
        if (audioRecord.state != AudioRecord.STATE_INITIALIZED) {
            audioRecord.release()
            running.set(false)
            throw IllegalStateException("Microphone could not be initialized.")
        }
        recorder = audioRecord
        audioRecord.startRecording()
        captureThread = Thread({
            val frame = ByteArray(FRAME_BYTES)
            while (running.get()) {
                val read = try { audioRecord.read(frame, 0, frame.size, AudioRecord.READ_BLOCKING) } catch (_: SecurityException) { -1 }
                if (read > 0) sendInputFrame(frame.copyOf(read))
                else if (read < 0) break
            }
            stopCapture()
        }, "sawtify-pcm-capture").apply { isDaemon = true; start() }
    }

    fun playOutputPcm(pcm24kMonoS16: ByteArray) {
        if (pcm24kMonoS16.isEmpty() || pcm24kMonoS16.size > 128 * 1024) return
        playbackExecutor.execute {
            try {
                var track = player
                if (track == null || track.state != AudioTrack.STATE_INITIALIZED) {
                    val minimum = AudioTrack.getMinBufferSize(
                        OUTPUT_SAMPLE_RATE,
                        AudioFormat.CHANNEL_OUT_MONO,
                        AudioFormat.ENCODING_PCM_16BIT,
                    )
                    if (minimum <= 0) return@execute
                    track = AudioTrack.Builder()
                        .setAudioAttributes(
                            AudioAttributes.Builder()
                                .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
                                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                                .build(),
                        )
                        .setAudioFormat(
                            AudioFormat.Builder()
                                .setSampleRate(OUTPUT_SAMPLE_RATE)
                                .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                                .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                                .build(),
                        )
                        .setBufferSizeInBytes(maxOf(minimum, 8192))
                        .setTransferMode(AudioTrack.MODE_STREAM)
                        .build()
                    player = track
                    track.play()
                }
                track.write(pcm24kMonoS16, 0, pcm24kMonoS16.size, AudioTrack.WRITE_BLOCKING)
            } catch (_: IllegalStateException) {
                // Device audio route changed; the next frame will retry initialization.
                releasePlayer()
            }
        }
    }

    fun stopCapture() {
        if (running.getAndSet(false)) {
            runCatching { recorder?.stop() }
            runCatching { recorder?.release() }
            recorder = null
        }
    }

    private fun releasePlayer() {
        runCatching { player?.pause() }
        runCatching { player?.flush() }
        runCatching { player?.release() }
        player = null
    }

    fun release() {
        stopCapture()
        captureThread?.interrupt()
        captureThread = null
        releasePlayer()
        playbackExecutor.shutdownNow()
    }
}
