package com.blockfit.app.data.models

data class WorkoutPayload(
    val exercise: String,
    val validReps: Int,
    val invalidReps: Int,
    val formScore: Double,
    val performanceScore: Double,
    val durationSeconds: Int,
    val confidence: Double,
    val workoutId: String,
    val verificationStatus: String = "UNVERIFIED"
)

data class NonceResponse(
    val nonce: String,
    val expiresAt: String? = null
)

data class WorkoutResponse(
    val id: String,
    val userId: String,
    val sequenceNumber: Int? = null,
    val exercise: String,
    val validReps: Int,
    val invalidReps: Int,
    val formScore: Double,
    val performanceScore: Double,
    val durationSeconds: Int,
    val confidence: Double,
    val workoutId: String,
    val verificationStatus: String,
    val createdAt: String,
    val integrityHmac: String? = null
)

data class WorkoutListResponse(
    val workouts: List<WorkoutResponse>
)
