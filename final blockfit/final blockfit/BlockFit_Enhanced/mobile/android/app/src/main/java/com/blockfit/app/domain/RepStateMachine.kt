package com.blockfit.app.domain

enum class RepPhase {
    START,
    TOP,
    DESCENDING,
    BOTTOM,
    ASCENDING
}

data class RepTrackerResult(
    val phase: RepPhase,
    val repCompleted: Boolean,
    val reps: Int
)

class RepPhaseTracker(
    private val topThreshold: Double,
    private val bottomThreshold: Double,
    private val minHoldFrames: Int = 3
) {
    var phase: RepPhase = RepPhase.START
        private set

    private var prevAngle: Double? = null
    private var bottomHoldFrames = 0
    private var topHoldFrames = 0
    private var reachedBottom = false
    private var armedAtTop = false
    var reps = 0
        private set

    fun update(angle: Double): RepTrackerResult {
        if (!angle.isFinite()) {
            interrupt()
            return RepTrackerResult(phase, false, reps)
        }

        val direction = if (prevAngle == null) 0.0 else angle - prevAngle!!
        var repCompleted = false

        if (angle <= bottomThreshold) {
            bottomHoldFrames += 1
            topHoldFrames = 0
            if (armedAtTop && bottomHoldFrames >= minHoldFrames) {
                phase = RepPhase.BOTTOM
                reachedBottom = true
            } else if (!armedAtTop && direction < 0) {
                phase = RepPhase.DESCENDING
            }
        } else {
            bottomHoldFrames = 0
            if (angle >= topThreshold) {
                topHoldFrames += 1
                if (topHoldFrames >= minHoldFrames) {
                    if (armedAtTop && reachedBottom) {
                        reps += 1
                        repCompleted = true
                    }
                    armedAtTop = true
                    reachedBottom = false
                    phase = RepPhase.TOP
                }
            } else {
                topHoldFrames = 0
                phase = if (direction < 0) RepPhase.DESCENDING else RepPhase.ASCENDING
            }
        }

        prevAngle = angle
        return RepTrackerResult(phase, repCompleted, reps)
    }

    fun reset() {
        interrupt()
        reps = 0
    }

    fun interrupt() {
        phase = RepPhase.START
        prevAngle = null
        bottomHoldFrames = 0
        topHoldFrames = 0
        reachedBottom = false
        armedAtTop = false
    }
}

data class RepFormResult(
    val score: Int,
    val issues: List<String>
)

class RepFormAccumulator(private val penaltyPerIssue: Int = 20) {
    private val activeIssueFrames = mutableMapOf<String, Int>()
    private var totalFrames = 0

    fun flagIfActive(issueKey: String, isActiveThisFrame: Boolean) {
        if (isActiveThisFrame) {
            activeIssueFrames[issueKey] = (activeIssueFrames[issueKey] ?: 0) + 1
        }
    }

    fun tickFrame() {
        totalFrames += 1
    }

    fun finish(presenceThreshold: Float = 0.25f): RepFormResult {
        val issues = mutableListOf<String>()
        for ((key, frames) in activeIssueFrames) {
            if (totalFrames == 0 || (frames.toFloat() / totalFrames.toFloat()) >= presenceThreshold) {
                issues.add(key)
            }
        }
        val score = (100 - issues.size * penaltyPerIssue).coerceAtLeast(0)
        return RepFormResult(score, issues)
    }
}
