package com.blockfit.app

import com.blockfit.app.domain.Angles
import com.blockfit.app.domain.PosePoint
import com.blockfit.app.domain.Smoother
import org.junit.Assert.assertEquals
import org.junit.Test

class AnglesTest {

    @Test
    fun testStraightAngle() {
        val a = PosePoint(0f, 0f)
        val b = PosePoint(0f, 1f)
        val c = PosePoint(0f, 2f)
        val angle = Angles.angleBetween(a, b, c)
        assertEquals(180.0, angle, 0.01)
    }

    @Test
    fun testRightAngle() {
        val a = PosePoint(0f, 0f)
        val b = PosePoint(0f, 1f)
        val c = PosePoint(1f, 1f)
        val angle = Angles.angleBetween(a, b, c)
        assertEquals(90.0, angle, 0.01)
    }

    @Test
    fun testMidpoint() {
        val a = PosePoint(0f, 0f)
        val b = PosePoint(2f, 4f)
        val mid = Angles.midpoint(a, b)
        assertEquals(1f, mid.x, 0.001f)
        assertEquals(2f, mid.y, 0.001f)
    }

    @Test
    fun testSmoother() {
        val smoother = Smoother(alpha = 0.5)
        val first = smoother.update(100.0)
        assertEquals(100.0, first, 0.001)

        val second = smoother.update(50.0)
        // 0.5 * 50 + 0.5 * 100 = 75.0
        assertEquals(75.0, second, 0.001)
    }
}
