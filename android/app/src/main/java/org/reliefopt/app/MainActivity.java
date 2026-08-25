package org.reliefopt.app;

import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String LEGACY_PWA_CLEANUP =
        "(() => {" +
        "const registrations = 'serviceWorker' in navigator ? navigator.serviceWorker.getRegistrations() : Promise.resolve([]);" +
        "const cacheNames = 'caches' in window ? caches.keys() : Promise.resolve([]);" +
        "Promise.all([registrations, cacheNames]).then(([items, names]) => {" +
        "const legacy = names.filter((name) => name.includes('-precache-'));" +
        "return Promise.all([...items.map((item) => item.unregister()), ...legacy.map((name) => caches.delete(name))])" +
        ".then(() => items.length + legacy.length);" +
        "}).then((removed) => { if (removed) window.location.reload(); }).catch(() => {});" +
        "})();";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        EdgeToEdge.enable(this);
        registerPlugin(NearbySyncPlugin.class);
        registerPlugin(NativeAudioRecorderPlugin.class);
        super.onCreate(savedInstanceState);
        clearLegacyPwaState();
    }

    private void clearLegacyPwaState() {
        getBridge().getWebView().clearCache(true);
        getBridge().getWebView().postDelayed(
            () -> getBridge().getWebView().evaluateJavascript(LEGACY_PWA_CLEANUP, null),
            750
        );
    }
}
