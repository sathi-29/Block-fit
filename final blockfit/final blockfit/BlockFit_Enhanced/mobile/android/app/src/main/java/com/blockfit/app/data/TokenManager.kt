package com.blockfit.app.data

import android.content.Context
import android.content.SharedPreferences
import com.blockfit.app.data.models.UserDto
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

object TokenManager {
    private const val PREF_NAME = "blockfit_secure_tokens"
    private const val KEY_TOKEN = "jwt_token"
    private const val KEY_USER_ID = "user_id"
    private const val KEY_USER_NAME = "user_name"
    private const val KEY_USER_EMAIL = "user_email"
    private const val KEY_USER_USERNAME = "user_username"

    private val _authState = MutableStateFlow<Boolean>(false)
    val authState: StateFlow<Boolean> = _authState.asStateFlow()

    private fun getPrefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
    }

    fun init(context: Context) {
        val token = getToken(context)
        _authState.value = !token.isNull_or_blank()
    }

    fun saveAuth(context: Context, token: String, user: UserDto) {
        getPrefs(context).edit().apply {
            putString(KEY_TOKEN, token)
            putString(KEY_USER_ID, user.id)
            putString(KEY_USER_NAME, user.name)
            putString(KEY_USER_EMAIL, user.email)
            putString(KEY_USER_USERNAME, user.username)
            apply()
        }
        _authState.value = true
    }

    fun getToken(context: Context): String? {
        return getPrefs(context).getString(KEY_TOKEN, null)
    }

    fun getUser(context: Context): UserDto? {
        val prefs = getPrefs(context)
        val id = prefs.getString(KEY_USER_ID, null) ?: return null
        val name = prefs.getString(KEY_USER_NAME, "") ?: ""
        val email = prefs.getString(KEY_USER_EMAIL, "") ?: ""
        val username = prefs.getString(KEY_USER_USERNAME, "") ?: ""
        return UserDto(id = id, email = email, username = username, name = name)
    }

    fun clear(context: Context) {
        getPrefs(context).edit().clear().apply()
        _authState.value = false
    }

    private fun String?.isNull_or_blank(): Boolean {
        return this == null || this.trim().isEmpty()
    }
}
