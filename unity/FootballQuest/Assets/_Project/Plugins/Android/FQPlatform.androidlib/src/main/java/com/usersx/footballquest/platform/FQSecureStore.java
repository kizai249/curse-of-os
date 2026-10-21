package com.usersx.footballquest.platform;

import android.content.Context;
import android.content.SharedPreferences;

import androidx.security.crypto.EncryptedSharedPreferences;
import androidx.security.crypto.MasterKeys;

/**
 * تخزين مشفّر بمفتاح في Android Keystore (EncryptedSharedPreferences) لرموز الاسترداد الصريحة.
 * DATA_CONTRACTS §5: الرمز يوصل مرة وحدة ويُحفظ مشفرًا على الجهاز فقط.
 */
public final class FQSecureStore {
    private static final String FILE = "fq_secure_store";
    private static SharedPreferences prefs;

    private FQSecureStore() {
    }

    private static synchronized SharedPreferences prefs(Context context) throws Exception {
        if (prefs == null) {
            String masterKey = MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC);
            prefs = EncryptedSharedPreferences.create(FILE, masterKey, context.getApplicationContext(),
                    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM);
        }
        return prefs;
    }

    public static String get(Context context, String key) {
        try {
            return prefs(context).getString(key, null);
        } catch (Exception e) {
            return null;
        }
    }

    public static boolean set(Context context, String key, String value) {
        try {
            return prefs(context).edit().putString(key, value).commit();
        } catch (Exception e) {
            return false;
        }
    }

    public static void delete(Context context, String key) {
        try {
            prefs(context).edit().remove(key).commit();
        } catch (Exception ignored) {
            // لا شيء: المفتاح غير موجود أو التخزين غير متاح.
        }
    }
}
