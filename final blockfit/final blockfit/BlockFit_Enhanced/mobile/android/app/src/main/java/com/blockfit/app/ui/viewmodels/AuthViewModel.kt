package com.blockfit.app.ui.viewmodels

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.blockfit.app.data.api.ApiClient
import com.blockfit.app.data.TokenManager
import com.blockfit.app.data.models.ErrorResponse
import com.blockfit.app.data.models.LoginRequest
import com.blockfit.app.data.models.RegisterRequest
import com.blockfit.app.data.models.UserDto
import com.google.gson.Gson
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class AuthUiState(
    val isLoading: Boolean = false,
    val isAuthenticated: Boolean = false,
    val user: UserDto? = null,
    val errorMessage: String? = null
)

class AuthViewModel(application: Application) : AndroidViewModel(application) {

    private val _uiState = MutableStateFlow(AuthUiState())
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    init {
        checkAuth()
    }

    fun checkAuth() {
        val app = getApplication<Application>()
        TokenManager.init(app)
        val token = TokenManager.getToken(app)
        val user = TokenManager.getUser(app)
        _uiState.value = AuthUiState(
            isAuthenticated = !token.isNullOrEmpty(),
            user = user
        )
    }

    fun login(identifier: String, password: String) {
        if (identifier.isBlank() || password.isBlank()) {
            _uiState.value = _uiState.value.copy(errorMessage = "Please enter email/username and password")
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            val app = getApplication<Application>()
            try {
                val api = ApiClient.getService(app)
                val response = api.login(LoginRequest(identifier = identifier.trim(), password = password))
                if (response.isSuccessful && response.body() != null) {
                    val authBody = response.body()!!
                    TokenManager.saveAuth(app, authBody.token, authBody.user)
                    _uiState.value = AuthUiState(
                        isLoading = false,
                        isAuthenticated = true,
                        user = authBody.user
                    )
                } else {
                    val errorMsg = parseError(response.errorBody()?.string())
                    _uiState.value = _uiState.value.copy(isLoading = false, errorMessage = errorMsg)
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    errorMessage = e.localizedMessage ?: "Unable to connect to server. Verify API Base URL in Profile."
                )
            }
        }
    }

    fun register(email: String, username: String, phone: String, password: String, name: String) {
        if (email.isBlank() || username.isBlank() || password.isBlank() || name.isBlank()) {
            _uiState.value = _uiState.value.copy(errorMessage = "Please fill in all required fields")
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            val app = getApplication<Application>()
            try {
                val api = ApiClient.getService(app)
                val response = api.register(
                    RegisterRequest(
                        email = email.trim(),
                        username = username.trim(),
                        phone = phone.trim().ifEmpty { null },
                        password = password,
                        name = name.trim()
                    )
                )
                if (response.isSuccessful && response.body() != null) {
                    val authBody = response.body()!!
                    TokenManager.saveAuth(app, authBody.token, authBody.user)
                    _uiState.value = AuthUiState(
                        isLoading = false,
                        isAuthenticated = true,
                        user = authBody.user
                    )
                } else {
                    val errorMsg = parseError(response.errorBody()?.string())
                    _uiState.value = _uiState.value.copy(isLoading = false, errorMessage = errorMsg)
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    errorMessage = e.localizedMessage ?: "Network error during registration"
                )
            }
        }
    }

    fun signOut() {
        val app = getApplication<Application>()
        TokenManager.clear(app)
        _uiState.value = AuthUiState(
            isAuthenticated = false,
            user = null
        )
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(errorMessage = null)
    }

    private fun parseError(json: String?): String {
        if (json.isNullOrEmpty()) return "An unexpected error occurred"
        return try {
            val errorResponse = Gson().fromJson(json, ErrorResponse::class.java)
            errorResponse.error ?: "Invalid response from server"
        } catch (e: Exception) {
            "Error processing request"
        }
    }
}
