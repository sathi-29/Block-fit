package com.blockfit.app

import com.blockfit.app.domain.Landmark
import com.blockfit.app.domain.PosePoint
import com.blockfit.app.domain.SquatAnalyzer
import org.junit.Assert.*
import org.junit.Test

class SquatAnalyzerTest {

    @Test
    fun testSquatAnalyzerRepCounting() {
        val analyzer = SquatAnalyzer()

        fun makePose(kneeAngle: Double): Map<Int, PosePoint> {
            // Build landmarks matching standing vs squatting knee angle
            val hip = PosePoint(0.5f, 0.4f)
            val knee = PosePoint(0.5f, 0.6f)
            val ankleX = if (kneeAngle < 120) 0.7f else 0.5f
            val ankle = PosePoint(ankleX, 0.8f)

            return mapOf(
                Landmark.LEFT_HIP to hip,
                Landmark.RIGHT_HIP to hip,
                Landmark.LEFT_KNEE to knee,
                Landmark.RIGHT_KNEE to knee,
                Landmark.LEFT_ANKLE to ankle,
                Landmark.RIGHT_ANKLE to ankle,
                Landmark.LEFT_SHOULDER to PosePoint(0.5f, 0.2f),
                Landmark.RIGHT_SHOULDER to PosePoint(0.5f, 0.2f)
            )
        }

        val frame1 = analyzer.update(makePose(170.0))
        assertEquals(0, frame1.reps)

        analyzer.update(makePose(120.0))
        analyzer.update(makePose(90.0))
        analyzer.update(makePose(90.0))
        analyzer.update(makePose(140.0))
        analyzer.update(makePose(170.0))
        val frameEnd = analyzer.update(makePose(170.0))

        assertEquals(1, frameEnd.reps)
    }
}
