package com.blockfit.app.data

import android.content.Context
import android.content.SharedPreferences
import com.blockfit.app.data.api.ApiClient

object NetworkConfig {
    private const val PREF_NAME = "blockfit_network_config"
    private const val KEY_BASE_URL = "base_url"
    
    // Default URL: 10.0.2.2 maps to host machine localhost in Android Emulator
    const val DEFAULT_BASE_URL = "http://10.0.2.2:4000/api/"

    private fun getPrefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
    }

    fun getBaseUrl(context: Context): String {
        val url = getPrefs(context).getString(KEY_BASE_URL, DEFAULT_BASE_URL) ?: DEFAULT_BASE_URL
        return if (url.endsWith("/")) url else "$url/"
    }

    fun setBaseUrl(context: Context, url: String) {
        val formatted = if (url.trim().endsWith("/")) url.trim() else "${url.trim()}/"
        getPrefs(context).edit().putString(KEY_BASE_URL, formatted).apply()
        ApiClient.resetClient()
    }
}
