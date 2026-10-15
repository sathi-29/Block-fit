package com.blockfit.app

import com.blockfit.app.data.models.WorkoutPayload
import com.blockfit.app.data.models.WorkoutResponse
import com.google.gson.Gson
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test

class SerializationTest {

    @Test
    fun testWorkoutPayloadJson() {
        val payload = WorkoutPayload(
            exercise = "squat",
            validReps = 12,
            invalidReps = 1,
            formScore = 92.0,
            performanceScore = 85.0,
            durationSeconds = 120,
            confidence = 0.94,
            workoutId = "wk_12345",
            verificationStatus = "UNVERIFIED"
        )

        val gson = Gson()
        val json = gson.toJson(payload)
        val deserialized = gson.fromJson(json, WorkoutPayload::class.java)

        assertEquals("squat", deserialized.exercise)
        assertEquals(12, deserialized.validReps)
        assertEquals(92.0, deserialized.formScore, 0.01)
    }

    @Test
    fun testWorkoutResponseJson() {
        val json = """
            {
                "id": "workout_123",
                "userId": "user_456",
                "sequenceNumber": 1,
                "exercise": "squat",
                "validReps": 10,
                "invalidReps": 0,
                "formScore": 95.0,
                "performanceScore": 90.0,
                "durationSeconds": 60,
                "confidence": 0.92,
                "workoutId": "wk_123",
                "verificationStatus": "UNVERIFIED",
                "createdAt": "2026-09-26T12:00:00.000Z",
                "integrityHmac": "hmac_abc"
            }
        """.trimIndent()

        val response = Gson().fromJson(json, WorkoutResponse::class.java)
        assertNotNull(response)
        assertEquals("workout_123", response.id)
        assertEquals("hmac_abc", response.integrityHmac)
    }
}
