package com.blockfit.app.ui.viewmodels

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.blockfit.app.data.api.ApiClient
import com.blockfit.app.data.models.WorkoutResponse
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class HistoryUiState(
    val isLoading: Boolean = false,
    val workouts: List<WorkoutResponse> = emptyList(),
    val errorMessage: String? = null
)

class HistoryViewModel(application: Application) : AndroidViewModel(application) {

    private val _uiState = MutableStateFlow(HistoryUiState())
    val uiState: StateFlow<HistoryUiState> = _uiState.asStateFlow()

    fun loadHistory() {
        val app = getApplication<Application>()
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            try {
                val api = ApiClient.getService(app)
                val response = api.listWorkouts()
                if (response.isSuccessful && response.body() != null) {
                    _uiState.value = HistoryUiState(
                        isLoading = false,
                        workouts = response.body()!!.workouts
                    )
                } else {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorMessage = "Unable to load workout history"
                    )
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    errorMessage = e.localizedMessage ?: "Network error"
                )
            }
        }
    }
}
