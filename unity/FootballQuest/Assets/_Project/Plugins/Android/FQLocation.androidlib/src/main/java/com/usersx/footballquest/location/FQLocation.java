package com.usersx.footballquest.location;

import android.app.Activity;
import android.location.Location;
import android.os.Build;

import com.google.android.gms.location.CurrentLocationRequest;
import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;
import com.google.android.gms.tasks.CancellationTokenSource;

import java.util.Locale;

/**
 * قراءة موقع وحدة أثناء استخدام التطبيق فقط. ما فيه أي تتبع مستمر ولا Geofencing API (MVP_SCOPE §2).
 * النتيجة JSON: {"status":"ok","lat":..,"lng":..,"accuracyM":..,"isMock":..} أو {"status":"timeout"|"error"}.
 */
public final class FQLocation {
    public interface Callback {
        void onResult(String json);
    }

    private FQLocation() {
    }

    public static void getCurrent(Activity activity, final Callback callback, int timeoutMs) {
        try {
            FusedLocationProviderClient client = LocationServices.getFusedLocationProviderClient(activity);
            CurrentLocationRequest request = new CurrentLocationRequest.Builder()
                    .setPriority(Priority.PRIORITY_HIGH_ACCURACY)
                    .setDurationMillis(timeoutMs)
                    .setMaxUpdateAgeMillis(0)
                    .build();
            CancellationTokenSource cancellation = new CancellationTokenSource();
            client.getCurrentLocation(request, cancellation.getToken())
                    .addOnSuccessListener(location -> callback.onResult(location == null ? "{\"status\":\"timeout\"}" : toJson(location)))
                    .addOnFailureListener(error -> callback.onResult("{\"status\":\"error\"}"));
        } catch (SecurityException e) {
            callback.onResult("{\"status\":\"error\"}");
        }
    }

    @SuppressWarnings("deprecation")
    private static String toJson(Location location) {
        boolean mock = Build.VERSION.SDK_INT >= 31 ? location.isMock() : location.isFromMockProvider();
        return String.format(Locale.US, "{\"status\":\"ok\",\"lat\":%.7f,\"lng\":%.7f,\"accuracyM\":%.1f,\"isMock\":%s}",
                location.getLatitude(), location.getLongitude(), location.getAccuracy(), mock ? "true" : "false");
    }
}
