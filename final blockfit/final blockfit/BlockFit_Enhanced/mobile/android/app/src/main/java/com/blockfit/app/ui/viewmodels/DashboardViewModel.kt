package com.blockfit.app.ui.viewmodels

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.blockfit.app.data.api.ApiClient
import com.blockfit.app.data.TokenManager
import com.blockfit.app.data.models.UserDto
import com.blockfit.app.data.models.WorkoutResponse
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class DashboardUiState(
    val isLoading: Boolean = false,
    val user: UserDto? = null,
    val totalWorkouts: Int = 0,
    val totalValidReps: Int = 0,
    val averageFormScore: Int = 0,
    val recentWorkouts: List<WorkoutResponse> = emptyList(),
    val errorMessage: String? = null
)

class DashboardViewModel(application: Application) : AndroidViewModel(application) {

    private val _uiState = MutableStateFlow(DashboardUiState())
    val uiState: StateFlow<DashboardUiState> = _uiState.asStateFlow()

    fun loadDashboard() {
        val app = getApplication<Application>()
        val user = TokenManager.getUser(app)
        _uiState.value = _uiState.value.copy(user = user, isLoading = true, errorMessage = null)

        viewModelScope.launch {
            try {
                val api = ApiClient.getService(app)
                val response = api.listWorkouts()
                if (response.isSuccessful && response.body() != null) {
                    val workouts = response.body()!!.workouts
                    val totalWorkouts = workouts.size
                    val totalReps = workouts.sumOf { it.validReps }
                    val avgScore = if (workouts.isNotEmpty()) {
                        workouts.map { it.formScore }.average().toInt()
                    } else 0

                    _uiState.value = DashboardUiState(
                        isLoading = false,
                        user = user,
                        totalWorkouts = totalWorkouts,
                        totalValidReps = totalReps,
                        averageFormScore = avgScore,
                        recentWorkouts = workouts.take(5)
                    )
                } else {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorMessage = "Failed to load workout summary"
                    )
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    errorMessage = e.localizedMessage ?: "Network error loading dashboard"
                )
            }
        }
    }
}
