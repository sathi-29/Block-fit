package com.blockfit.app.domain

import kotlin.math.abs
import kotlin.math.atan2
import kotlin.math.hypot

object Angles {

    fun angleBetween(a: PosePoint?, b: PosePoint?, c: PosePoint?): Double {
        if (a == null || b == null || c == null) return 0.0
        val radians = atan2((c.y - b.y).toDouble(), (c.x - b.x).toDouble()) -
                atan2((a.y - b.y).toDouble(), (a.x - b.x).toDouble())
        var deg = abs(radians * 180.0 / Math.PI)
        if (deg > 180.0) deg = 360.0 - deg
        return deg
    }

    fun distanceBetween(a: PosePoint, b: PosePoint): Double {
        return hypot((a.x - b.x).toDouble(), (a.y - b.y).toDouble())
    }

    fun midpoint(a: PosePoint?, b: PosePoint?): PosePoint {
        if (a == null && b == null) return PosePoint(0f, 0f)
        if (a == null) return b!!
        if (b == null) return a
        return PosePoint((a.x + b.x) / 2f, (a.y + b.y) / 2f)
    }

    fun averageOrEither(a: Double?, b: Double?): Double {
        if (a == null && b == null) return 0.0
        if (a == null) return b!!
        if (b == null) return a
        return (a + b) / 2.0
    }
}

class Smoother(private val alpha: Double = 0.35) {
    private var value: Double? = null

    fun update(newValue: Double?): Double {
        if (newValue == null || newValue.isNaN()) return value ?: 0.0
        value = if (value == null) {
            newValue
        } else {
            alpha * newValue + (1.0 - alpha) * value!!
        }
        return value!!
    }

    fun reset() {
        value = null
    }

    fun getValue(): Double? = value
}
