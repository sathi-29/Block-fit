package com.blockfit.app.data.models

data class VerificationRequest(
    val exercise: String,
    val validReps: Int,
    val score: Double,
    val workoutId: String,
    val verificationId: String? = null,
    val credentialStatus: String? = "VERIFIED"
)

data class VerificationRecordDto(
    val verificationId: String,
    val userId: String,
    val exercise: String,
    val validReps: Int,
    val score: Double,
    val timestamp: String,
    val credentialStatus: String,
    val hash: String? = null
)

data class PublicVerificationResponse(
    val verificationId: String,
    val workout: String,
    val validReps: Int,
    val score: Double,
    val verificationStatus: String,
    val serverTimestamp: String,
    val hash: String,
    val canonicalPayload: String? = null,
    val hashAlgorithm: String? = "SHA-256",
    val claims: VerificationClaims? = null
)

data class VerificationClaims(
    val attestsTo: List<String> = emptyList(),
    val doesNotAttestTo: List<String> = emptyList()
)
