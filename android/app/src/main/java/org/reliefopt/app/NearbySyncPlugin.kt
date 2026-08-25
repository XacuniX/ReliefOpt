package org.reliefopt.app

import android.Manifest
import android.os.Build
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import com.google.android.gms.nearby.Nearby
import com.google.android.gms.nearby.connection.AdvertisingOptions
import com.google.android.gms.nearby.connection.ConnectionInfo
import com.google.android.gms.nearby.connection.ConnectionLifecycleCallback
import com.google.android.gms.nearby.connection.ConnectionResolution
import com.google.android.gms.nearby.connection.ConnectionsClient
import com.google.android.gms.nearby.connection.DiscoveredEndpointInfo
import com.google.android.gms.nearby.connection.DiscoveryOptions
import com.google.android.gms.nearby.connection.EndpointDiscoveryCallback
import com.google.android.gms.nearby.connection.Payload
import com.google.android.gms.nearby.connection.PayloadCallback
import com.google.android.gms.nearby.connection.PayloadTransferUpdate
import com.google.android.gms.nearby.connection.Strategy
import java.nio.charset.StandardCharsets
import java.util.concurrent.ConcurrentHashMap

@CapacitorPlugin(
    name = "NearbySync",
    permissions = [
        Permission(alias = "coarseLocation", strings = [Manifest.permission.ACCESS_COARSE_LOCATION]),
        Permission(alias = "fineLocation", strings = [Manifest.permission.ACCESS_FINE_LOCATION]),
        Permission(
            alias = "bluetooth",
            strings = [
                Manifest.permission.BLUETOOTH_ADVERTISE,
                Manifest.permission.BLUETOOTH_CONNECT,
                Manifest.permission.BLUETOOTH_SCAN,
            ],
        ),
        Permission(alias = "nearbyWifi", strings = [Manifest.permission.NEARBY_WIFI_DEVICES]),
    ],
)
class NearbySyncPlugin : Plugin() {
    companion object {
        private const val SERVICE_ID = "org.reliefopt.app.nearby"
        private const val MAX_SNAPSHOT_BYTES = 900_000
        private val STRATEGY = Strategy.P2P_POINT_TO_POINT
    }

    private val endpointNames = ConcurrentHashMap<String, String>()
    private val outgoingEndpoints = ConcurrentHashMap.newKeySet<String>()
    private val connectedEndpoints = ConcurrentHashMap.newKeySet<String>()
    private var localDeviceName = "ReliefOpt Android"

    private val connectionsClient: ConnectionsClient by lazy {
        Nearby.getConnectionsClient(activity)
    }

    private val payloadCallback = object : PayloadCallback() {
        override fun onPayloadReceived(endpointId: String, payload: Payload) {
            val bytes = payload.asBytes() ?: return emitError("A nearby device sent an unsupported payload type.")
            val data = JSObject().apply {
                put("endpointId", endpointId)
                put("endpointName", endpointNames[endpointId] ?: "Nearby ReliefOpt device")
                put("payloadId", payload.id.toString())
                put("payload", String(bytes, StandardCharsets.UTF_8))
            }
            notifyListeners("payloadReceived", data)
        }

        override fun onPayloadTransferUpdate(endpointId: String, update: PayloadTransferUpdate) {
            val status = when (update.status) {
                PayloadTransferUpdate.Status.IN_PROGRESS -> "in_progress"
                PayloadTransferUpdate.Status.SUCCESS -> "success"
                PayloadTransferUpdate.Status.FAILURE -> "failure"
                PayloadTransferUpdate.Status.CANCELED -> "canceled"
                else -> "unknown"
            }
            val data = JSObject().apply {
                put("endpointId", endpointId)
                put("payloadId", update.payloadId.toString())
                put("status", status)
                put("bytesTransferred", update.bytesTransferred)
                put("totalBytes", update.totalBytes)
            }
            notifyListeners("transferUpdate", data)
        }
    }

    private val connectionLifecycleCallback = object : ConnectionLifecycleCallback() {
        override fun onConnectionInitiated(endpointId: String, info: ConnectionInfo) {
            endpointNames[endpointId] = info.endpointName
            val outgoing = outgoingEndpoints.contains(endpointId)
            notifyListeners("connectionInitiated", JSObject().apply {
                put("endpointId", endpointId)
                put("endpointName", info.endpointName)
                put("authenticationDigits", info.authenticationDigits)
                put("incoming", !outgoing)
            })
            if (outgoing) acceptEndpoint(endpointId, null)
        }

        override fun onConnectionResult(endpointId: String, resolution: ConnectionResolution) {
            outgoingEndpoints.remove(endpointId)
            val connected = resolution.status.isSuccess
            if (connected) {
                connectedEndpoints.add(endpointId)
                connectionsClient.stopAdvertising()
                connectionsClient.stopDiscovery()
            }
            notifyListeners("connectionResult", JSObject().apply {
                put("endpointId", endpointId)
                put("endpointName", endpointNames[endpointId] ?: "Nearby ReliefOpt device")
                put("status", if (connected) "connected" else "rejected")
                if (!connected) put("error", resolution.status.statusMessage ?: "Connection was not accepted.")
            })
        }

        override fun onDisconnected(endpointId: String) {
            connectedEndpoints.remove(endpointId)
            outgoingEndpoints.remove(endpointId)
            notifyListeners("disconnected", JSObject().apply {
                put("endpointId", endpointId)
                put("endpointName", endpointNames.remove(endpointId) ?: "Nearby ReliefOpt device")
            })
        }
    }

    private val endpointDiscoveryCallback = object : EndpointDiscoveryCallback() {
        override fun onEndpointFound(endpointId: String, info: DiscoveredEndpointInfo) {
            endpointNames[endpointId] = info.endpointName
            notifyListeners("endpointFound", JSObject().apply {
                put("endpointId", endpointId)
                put("endpointName", info.endpointName)
            })
        }

        override fun onEndpointLost(endpointId: String) {
            notifyListeners("endpointLost", JSObject().apply {
                put("endpointId", endpointId)
                put("endpointName", endpointNames.remove(endpointId) ?: "Nearby ReliefOpt device")
            })
        }
    }

    @PluginMethod
    fun getAvailability(call: PluginCall) {
        call.resolve(JSObject().apply {
            put("available", true)
            put("permissionsGranted", hasNearbyPermissions())
            put("maxPayloadBytes", MAX_SNAPSHOT_BYTES)
        })
    }

    @PluginMethod
    fun requestNearbyPermissions(call: PluginCall) {
        if (hasNearbyPermissions()) {
            call.resolve(JSObject().put("granted", true))
            return
        }
        requestPermissionForAliases(requiredPermissionAliases(), call, "permissionRequestFinished")
    }

    @PermissionCallback
    private fun permissionRequestFinished(call: PluginCall) {
        val granted = hasNearbyPermissions()
        if (granted) call.resolve(JSObject().put("granted", true))
        else call.reject("Nearby permission was denied. ReliefOpt cannot discover or receive from nearby phones.", "PERMISSION_DENIED")
    }

    @PluginMethod
    fun startAdvertising(call: PluginCall) {
        if (!ensurePermissions(call)) return
        localDeviceName = cleanDeviceName(call.getString("deviceName"))
        connectionsClient.stopAllEndpoints()
        clearConnectionState()
        val options = AdvertisingOptions.Builder().setStrategy(STRATEGY).build()
        connectionsClient.startAdvertising(localDeviceName, SERVICE_ID, connectionLifecycleCallback, options)
            .addOnSuccessListener { call.resolve(JSObject().put("advertising", true)) }
            .addOnFailureListener { error -> rejectNearby(call, "Unable to wait for nearby phones.", error) }
    }

    @PluginMethod
    fun startDiscovery(call: PluginCall) {
        if (!ensurePermissions(call)) return
        localDeviceName = cleanDeviceName(call.getString("deviceName"))
        connectionsClient.stopAllEndpoints()
        clearConnectionState()
        val options = DiscoveryOptions.Builder().setStrategy(STRATEGY).build()
        connectionsClient.startDiscovery(SERVICE_ID, endpointDiscoveryCallback, options)
            .addOnSuccessListener { call.resolve(JSObject().put("discovering", true)) }
            .addOnFailureListener { error -> rejectNearby(call, "Unable to search for nearby phones.", error) }
    }

    @PluginMethod
    fun requestConnection(call: PluginCall) {
        if (!ensurePermissions(call)) return
        val endpointId = call.getString("endpointId")
        if (endpointId.isNullOrBlank()) return call.reject("A nearby phone must be selected.", "INVALID_ENDPOINT")
        outgoingEndpoints.add(endpointId)
        connectionsClient.requestConnection(localDeviceName, endpointId, connectionLifecycleCallback)
            .addOnSuccessListener { call.resolve(JSObject().put("requested", true)) }
            .addOnFailureListener { error ->
                outgoingEndpoints.remove(endpointId)
                rejectNearby(call, "Unable to request a nearby connection.", error)
            }
    }

    @PluginMethod
    fun acceptConnection(call: PluginCall) {
        val endpointId = call.getString("endpointId")
        if (endpointId.isNullOrBlank()) return call.reject("No incoming connection is waiting.", "INVALID_ENDPOINT")
        acceptEndpoint(endpointId, call)
    }

    @PluginMethod
    fun rejectConnection(call: PluginCall) {
        val endpointId = call.getString("endpointId")
        if (endpointId.isNullOrBlank()) return call.reject("No incoming connection is waiting.", "INVALID_ENDPOINT")
        connectionsClient.rejectConnection(endpointId)
            .addOnSuccessListener { call.resolve() }
            .addOnFailureListener { error -> rejectNearby(call, "Unable to reject the connection.", error) }
    }

    @PluginMethod
    fun sendSnapshot(call: PluginCall) {
        val endpointId = call.getString("endpointId")
        val snapshotPayload = call.getString("payload")
        if (endpointId.isNullOrBlank() || !connectedEndpoints.contains(endpointId)) {
            return call.reject("Connect to a nearby phone before sending.", "NOT_CONNECTED")
        }
        if (snapshotPayload.isNullOrBlank()) return call.reject("There is no snapshot to send.", "EMPTY_PAYLOAD")
        val bytes = snapshotPayload.toByteArray(StandardCharsets.UTF_8)
        if (bytes.size > MAX_SNAPSHOT_BYTES) {
            return call.reject("The cached snapshot is too large for this proof of concept.", "PAYLOAD_TOO_LARGE")
        }
        val payload = Payload.fromBytes(bytes)
        connectionsClient.sendPayload(endpointId, payload)
            .addOnSuccessListener { call.resolve(JSObject().apply {
                put("payloadId", payload.id.toString())
                put("totalBytes", bytes.size)
            }) }
            .addOnFailureListener { error -> rejectNearby(call, "Unable to send the snapshot.", error) }
    }

    @PluginMethod
    fun stop(call: PluginCall) {
        connectionsClient.stopAdvertising()
        connectionsClient.stopDiscovery()
        connectionsClient.stopAllEndpoints()
        clearConnectionState()
        call.resolve()
    }

    override fun handleOnDestroy() {
        connectionsClient.stopAdvertising()
        connectionsClient.stopDiscovery()
        connectionsClient.stopAllEndpoints()
        clearConnectionState()
        super.handleOnDestroy()
    }

    private fun acceptEndpoint(endpointId: String, call: PluginCall?) {
        connectionsClient.acceptConnection(endpointId, payloadCallback)
            .addOnSuccessListener { call?.resolve(JSObject().put("accepted", true)) }
            .addOnFailureListener { error ->
                if (call != null) rejectNearby(call, "Unable to accept the connection.", error)
                else emitError("Unable to accept the connection: ${error.message ?: "unknown Nearby error"}")
            }
    }

    private fun requiredPermissionAliases(): Array<String> = when {
        Build.VERSION.SDK_INT >= 32 -> arrayOf("bluetooth", "nearbyWifi")
        Build.VERSION.SDK_INT == 31 -> arrayOf("bluetooth", "fineLocation")
        Build.VERSION.SDK_INT >= 29 -> arrayOf("fineLocation")
        else -> arrayOf("coarseLocation")
    }

    private fun hasNearbyPermissions(): Boolean = requiredPermissionAliases().all {
        getPermissionState(it) == PermissionState.GRANTED
    }

    private fun ensurePermissions(call: PluginCall): Boolean {
        if (hasNearbyPermissions()) return true
        call.reject("Nearby permissions are required before starting.", "PERMISSION_REQUIRED")
        return false
    }

    private fun cleanDeviceName(value: String?): String {
        val clean = value?.trim()?.take(40)
        return if (clean.isNullOrBlank()) "ReliefOpt Android" else clean
    }

    private fun clearConnectionState() {
        endpointNames.clear()
        outgoingEndpoints.clear()
        connectedEndpoints.clear()
    }

    private fun rejectNearby(call: PluginCall, message: String, error: Exception) {
        call.reject("$message ${error.message ?: "Check Bluetooth and Wi-Fi permissions."}", "NEARBY_ERROR", error)
    }

    private fun emitError(message: String) {
        notifyListeners("nearbyError", JSObject().put("message", message))
    }
}
