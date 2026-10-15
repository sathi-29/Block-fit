package com.blockfit.app.data.api

import com.blockfit.app.data.models.*
import retrofit2.Response
import retrofit2.http.*

interface BlockFitApiService {

    @POST("auth/register")
    suspend fun register(@Body request: RegisterRequest): Response<AuthResponse>

    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): Response<AuthResponse>

    @GET("users/me")
    suspend fun getProfile(): Response<UserDto>

    @POST("workouts/nonce")
    suspend fun issueNonce(): Response<NonceResponse>

    @POST("workouts")
    suspend fun submitWorkout(
        @Header("X-Workout-Nonce") nonce: String,
        @Body payload: WorkoutPayload
    ): Response<WorkoutResponse>

    @GET("workouts")
    suspend fun listWorkouts(): Response<WorkoutListResponse>

    @POST("verification/register")
    suspend fun registerVerification(@Body request: VerificationRequest): Response<VerificationRecordDto>

    @GET("verification/public/{verificationId}")
    suspend fun getPublicVerification(@Path("verificationId") verificationId: String): Response<PublicVerificationResponse>

    @POST("verification/{verificationId}/revoke")
    suspend fun revokeVerification(@Path("verificationId") verificationId: String): Response<VerificationRecordDto>
}
