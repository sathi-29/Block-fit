package com.blockfit.app.ui.viewmodels

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.blockfit.app.camera.PoseDetectionState
import com.blockfit.app.data.api.ApiClient
import com.blockfit.app.data.models.VerificationRequest
import com.blockfit.app.data.models.WorkoutPayload
import com.blockfit.app.data.models.WorkoutResponse
import com.blockfit.app.domain.*
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.UUID

data class CompletedWorkoutSummary(
    val exerciseId: String,
    val exerciseName: String,
    val validReps: Int,
    val invalidReps: Int,
    val formScore: Double,
    val performanceScore: Double,
    val durationSeconds: Int,
    val confidence: Double,
    val workoutId: String,
    val issues: List<String>
)

data class WorkoutUiState(
    val selectedExerciseId: String = "squat",
    val activeAnalyzer: ExerciseAnalyzer = SquatAnalyzer(),
    val isSessionActive: Boolean = false,
    val durationSeconds: Int = 0,
    val poseState: PoseDetectionState? = null,
    val validReps: Int = 0,
    val invalidReps: Int = 0,
    val currentFormScore: Int = 100,
    val liveIssues: List<String> = emptyList(),
    val completedSummary: CompletedWorkoutSummary? = null,
    val isSubmitting: Boolean = false,
    val isSubmitted: Boolean = false,
    val submittedWorkoutResponse: WorkoutResponse? = null,
    val verificationId: String? = null,
    val errorMessage: String? = null
)

class WorkoutViewModel(application: Application) : AndroidViewModel(application) {

    private val _uiState = MutableStateFlow(WorkoutUiState())
    val uiState: StateFlow<WorkoutUiState> = _uiState.asStateFlow()

    private var timerJob: Job? = null
    private var sessionStartTime: Long = 0
    private val completedRepScores = mutableListOf<Int>()
    private val allRepIssues = mutableSetOf<String>()

    fun startSession(exerciseId: String) {
        val analyzer = createExerciseAnalyzer(exerciseId)
        analyzer.reset()
        completedRepScores.clear()
        allRepIssues.clear()
        sessionStartTime = System.currentTimeMillis()

        _uiState.value = WorkoutUiState(
            selectedExerciseId = exerciseId,
            activeAnalyzer = analyzer,
            isSessionActive = true,
            durationSeconds = 0
        )

        timerJob?.cancel()
        timerJob = viewModelScope.launch {
            while (_uiState.value.isSessionActive) {
                delay(1000)
                _uiState.value = _uiState.value.copy(
                    durationSeconds = _uiState.value.durationSeconds + 1
                )
            }
        }
    }

    fun onPoseUpdated(state: PoseDetectionState) {
        if (!_uiState.value.isSessionActive) return

        val frame = state.frame
        var newValidReps = _uiState.value.validReps
        var newInvalidReps = _uiState.value.invalidReps

        if (frame != null) {
            if (frame.repCompleted && frame.repResult != null) {
                completedRepScores.add(frame.repResult.score)
                allRepIssues.addAll(frame.repResult.issueLabels)
                if (frame.repResult.score >= 80) {
                    newValidReps += 1
                } else {
                    newInvalidReps += 1
                }
            }
        } else {
            _uiState.value.activeAnalyzer.onFrameMissing()
        }

        val avgScore = if (completedRepScores.isNotEmpty()) {
            completedRepScores.average().toInt()
        } else 100

        _uiState.value = _uiState.value.copy(
            poseState = state,
            validReps = newValidReps,
            invalidReps = newInvalidReps,
            currentFormScore = avgScore,
            liveIssues = frame?.liveIssues ?: emptyList()
        )
    }

    fun endSession(): CompletedWorkoutSummary {
        _uiState.value = _uiState.value.copy(isSessionActive = false)
        timerJob?.cancel()

        val currentState = _uiState.value
        val duration = currentState.durationSeconds.coerceAtLeast(1)
        val validReps = currentState.validReps
        val invalidReps = currentState.invalidReps
        val formScore = if (completedRepScores.isNotEmpty()) completedRepScores.average() else 100.0
        val perfScore = (validReps * 10.0).coerceAtMost(100.0)
        val generatedWorkoutId = "wk_${UUID.randomUUID().toString().take(12)}"

        val summary = CompletedWorkoutSummary(
            exerciseId = currentState.selectedExerciseId,
            exerciseName = currentState.activeAnalyzer.label,
            validReps = validReps,
            invalidReps = invalidReps,
            formScore = formScore,
            performanceScore = perfScore,
            durationSeconds = duration,
            confidence = 0.91,
            workoutId = generatedWorkoutId,
            issues = allRepIssues.toList()
        )

        _uiState.value = _uiState.value.copy(completedSummary = summary)
        return summary
    }

    fun submitWorkout() {
        val summary = _uiState.value.completedSummary ?: return
        val app = getApplication<Application>()

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSubmitting = true, errorMessage = null)
            try {
                val api = ApiClient.getService(app)

                // 1. Fetch Session Nonce
                val nonceResponse = api.issueNonce()
                if (!nonceResponse.isSuccessful || nonceResponse.body() == null) {
                    _uiState.value = _uiState.value.copy(
                        isSubmitting = false,
                        errorMessage = "Failed to obtain workout session nonce from backend"
                    )
                    return@launch
                }
                val nonce = nonceResponse.body()!!.nonce

                // 2. Submit Workout Payload with Nonce Header
                val payload = WorkoutPayload(
                    exercise = summary.exerciseId,
                    validReps = summary.validReps,
                    invalidReps = summary.invalidReps,
                    formScore = summary.formScore,
                    performanceScore = summary.performanceScore,
                    durationSeconds = summary.durationSeconds,
                    confidence = summary.confidence,
                    workoutId = summary.workoutId,
                    verificationStatus = "UNVERIFIED"
                )

                val workoutRes = api.submitWorkout(nonce = nonce, payload = payload)
                if (!workoutRes.isSuccessful || workoutRes.body() == null) {
                    _uiState.value = _uiState.value.copy(
                        isSubmitting = false,
                        errorMessage = "Failed to persist workout record"
                    )
                    return@launch
                }
                val savedWorkout = workoutRes.body()!!

                // 3. Register Verification Credential Record
                val verReq = VerificationRequest(
                    exercise = summary.exerciseId,
                    validReps = summary.validReps,
                    score = summary.formScore,
                    workoutId = summary.workoutId,
                    credentialStatus = "VERIFIED"
                )
                val verRes = api.registerVerification(verReq)
                val verificationId = if (verRes.isSuccessful && verRes.body() != null) {
                    verRes.body()!!.verificationId
                } else null

                _uiState.value = _uiState.value.copy(
                    isSubmitting = false,
                    isSubmitted = true,
                    submittedWorkoutResponse = savedWorkout,
                    verificationId = verificationId
                )

            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isSubmitting = false,
                    errorMessage = e.localizedMessage ?: "Network error submitting workout"
                )
            }
        }
    }
}
