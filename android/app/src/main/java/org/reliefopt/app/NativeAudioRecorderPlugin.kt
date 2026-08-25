package org.reliefopt.app

import android.Manifest
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.util.Base64
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import java.io.ByteArrayOutputStream
import kotlin.math.sqrt

@CapacitorPlugin(
    name = "NativeAudioRecorder",
    permissions = [Permission(alias = "microphone", strings = [Manifest.permission.RECORD_AUDIO])],
)
class NativeAudioRecorderPlugin : Plugin() {
    companion object {
        private const val SAMPLE_RATE = 16_000
        private const val CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO
        private const val AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT
    }

    private val lock = Any()
    private var recorder: AudioRecord? = null
    private var captureThread: Thread? = null
    private var capturedAudio = ByteArrayOutputStream()
    private var completedAudio: ByteArray? = null

    @Volatile private var recording = false
    @Volatile private var inputLevel = 0

    @PluginMethod
    fun requestMicrophonePermission(call: PluginCall) {
        if (getPermissionState("microphone") == PermissionState.GRANTED) {
            call.resolve(JSObject().put("granted", true))
            return
        }
        requestPermissionForAlias("microphone", call, "microphonePermissionFinished")
    }

    @PermissionCallback
    private fun microphonePermissionFinished(call: PluginCall) {
        val granted = getPermissionState("microphone") == PermissionState.GRANTED
        if (granted) call.resolve(JSObject().put("granted", true))
        else call.reject("Microphone permission was denied.", "PERMISSION_DENIED")
    }

    @PluginMethod
    fun start(call: PluginCall) {
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            call.reject("Microphone permission is required before recording.", "PERMISSION_REQUIRED")
            return
        }
        synchronized(lock) {
            if (recording) {
                call.reject("A recording is already in progress.", "RECORDING_ACTIVE")
                return
            }
        }

        val minBufferSize = AudioRecord.getMinBufferSize(SAMPLE_RATE, CHANNEL_CONFIG, AUDIO_FORMAT)
        if (minBufferSize <= 0) {
            call.reject("This phone cannot create a 16 kHz microphone recorder.", "RECORDER_UNAVAILABLE")
            return
        }

        val activeRecorder = AudioRecord.Builder()
            .setAudioSource(MediaRecorder.AudioSource.VOICE_RECOGNITION)
            .setAudioFormat(
                AudioFormat.Builder()
                    .setEncoding(AUDIO_FORMAT)
                    .setSampleRate(SAMPLE_RATE)
                    .setChannelMask(CHANNEL_CONFIG)
                    .build(),
            )
            .setBufferSizeInBytes(maxOf(minBufferSize, 4_096) * 2)
            .build()

        if (activeRecorder.state != AudioRecord.STATE_INITIALIZED) {
            activeRecorder.release()
            call.reject("This phone could not initialize its microphone recorder.", "RECORDER_UNAVAILABLE")
            return
        }

        synchronized(lock) {
            recorder = activeRecorder
            capturedAudio = ByteArrayOutputStream()
            completedAudio = null
            inputLevel = 0
            recording = true
        }

        try {
            activeRecorder.startRecording()
        } catch (error: IllegalStateException) {
            finishRecording()
            call.reject("The phone microphone could not start recording.", "RECORDER_START_FAILED", error)
            return
        }

        val thread = Thread({ captureAudio(activeRecorder) }, "ReliefOptNativeAudio")
        synchronized(lock) { captureThread = thread }
        thread.start()
        call.resolve(JSObject().apply {
            put("recording", true)
            put("sampleRate", SAMPLE_RATE)
        })
    }

    @PluginMethod
    fun getLevel(call: PluginCall) {
        call.resolve(JSObject().apply {
            put("level", inputLevel)
            put("recording", recording)
        })
    }

    @PluginMethod
    fun stop(call: PluginCall) {
        val bytes = finishRecording()
        if (bytes.isEmpty()) {
            call.reject("No microphone audio was captured.", "EMPTY_RECORDING")
            return
        }
        synchronized(lock) { completedAudio = bytes }
        call.resolve(JSObject().apply {
            put("sampleRate", SAMPLE_RATE)
            put("sampleCount", bytes.size / 2)
            put("durationMs", bytes.size * 1_000L / (SAMPLE_RATE * 2L))
        })
    }

    @PluginMethod
    fun readChunk(call: PluginCall) {
        val offsetSamples = call.getInt("offsetSamples", 0) ?: 0
        val requestedSamples = call.getInt("sampleCount", 8_192) ?: 8_192
        if (offsetSamples < 0 || requestedSamples !in 1..16_384) {
            call.reject("Invalid captured-audio chunk range.", "INVALID_CHUNK_RANGE")
            return
        }

        val chunk: ByteArray
        val totalSamples: Int
        synchronized(lock) {
            val bytes = completedAudio
            if (bytes == null) {
                call.reject("No completed microphone recording is available.", "NO_CAPTURE")
                return
            }
            totalSamples = bytes.size / 2
            if (offsetSamples >= totalSamples) {
                call.reject("Captured-audio chunk offset is out of range.", "INVALID_CHUNK_RANGE")
                return
            }
            val startByte = offsetSamples * 2
            val endByte = minOf(bytes.size, startByte + requestedSamples * 2)
            chunk = bytes.copyOfRange(startByte, endByte)
        }

        call.resolve(JSObject().apply {
            put("pcmBase64", Base64.encodeToString(chunk, Base64.NO_WRAP))
            put("offsetSamples", offsetSamples)
            put("sampleCount", chunk.size / 2)
            put("totalSamples", totalSamples)
        })
    }

    @PluginMethod
    fun discardCapture(call: PluginCall) {
        synchronized(lock) { completedAudio = null }
        call.resolve()
    }

    override fun handleOnDestroy() {
        finishRecording()
        synchronized(lock) { completedAudio = null }
        super.handleOnDestroy()
    }

    private fun captureAudio(activeRecorder: AudioRecord) {
        val buffer = ByteArray(4_096)
        while (recording) {
            val count = activeRecorder.read(buffer, 0, buffer.size, AudioRecord.READ_BLOCKING)
            if (count <= 0) continue
            synchronized(lock) { capturedAudio.write(buffer, 0, count) }
            inputLevel = calculateLevel(buffer, count)
        }
    }

    private fun finishRecording(): ByteArray {
        val activeRecorder: AudioRecord?
        val thread: Thread?
        synchronized(lock) {
            recording = false
            activeRecorder = recorder
            recorder = null
            thread = captureThread
            captureThread = null
        }
        try {
            activeRecorder?.stop()
        } catch (_: IllegalStateException) {
            // Recording may not have reached the active state yet.
        }
        thread?.join(1_000)
        activeRecorder?.release()
        return synchronized(lock) {
            inputLevel = 0
            capturedAudio.toByteArray().also { capturedAudio.reset() }
        }
    }

    private fun calculateLevel(buffer: ByteArray, count: Int): Int {
        var sum = 0.0
        var samples = 0
        var index = 0
        while (index + 1 < count) {
            val sample = ((buffer[index + 1].toInt() shl 8) or (buffer[index].toInt() and 0xff)).toShort()
            val normalized = sample.toDouble() / Short.MAX_VALUE
            sum += normalized * normalized
            samples += 1
            index += 2
        }
        if (samples == 0) return 0
        return (sqrt(sum / samples) * 1_000).toInt().coerceIn(0, 100)
    }
}
