package com.blockfit.app

import com.blockfit.app.domain.RepFormAccumulator
import com.blockfit.app.domain.RepPhase
import com.blockfit.app.domain.RepPhaseTracker
import org.junit.Assert.*
import org.junit.Test

class RepStateMachineTest {

    @Test
    fun testRepPhaseTrackerFullCycle() {
        val tracker = RepPhaseTracker(topThreshold = 160.0, bottomThreshold = 100.0, minHoldFrames = 2)

        // Initial state at top
        assertEquals(RepPhase.START, tracker.phase)
        assertEquals(0, tracker.reps)

        tracker.update(165.0)
        tracker.update(170.0)
        assertEquals(RepPhase.TOP, tracker.phase)

        // Descending
        tracker.update(140.0)
        assertEquals(RepPhase.DESCENDING, tracker.phase)

        // Reaching bottom (hold frame 1)
        tracker.update(95.0)

        // Reaching bottom (hold frame 2 -> transition to BOTTOM)
        tracker.update(90.0)
        assertEquals(RepPhase.BOTTOM, tracker.phase)

        // Ascending
        tracker.update(130.0)
        assertEquals(RepPhase.ASCENDING, tracker.phase)

        // Returning to top (hold frame 1)
        tracker.update(165.0)

        // Returning to top (hold frame 2 -> rep completed!)
        val res = tracker.update(170.0)
        assertEquals(RepPhase.TOP, tracker.phase)
        assertTrue(res.repCompleted)
        assertEquals(1, tracker.reps)
    }

    @Test
    fun testRepRequiresStableTopBeforeBottom() {
        val tracker = RepPhaseTracker(topThreshold = 160.0, bottomThreshold = 100.0, minHoldFrames = 2)

        tracker.update(90.0)
        tracker.update(90.0)
        tracker.update(170.0)
        tracker.update(170.0)

        assertEquals(0, tracker.reps)
    }

    @Test
    fun testInterruptDiscardsPartialCycleButPreservesCompletedReps() {
        val tracker = RepPhaseTracker(topThreshold = 160.0, bottomThreshold = 100.0, minHoldFrames = 2)
        listOf(170.0, 170.0, 130.0, 90.0, 90.0).forEach(tracker::update)

        tracker.interrupt()
        listOf(170.0, 170.0).forEach(tracker::update)
        assertEquals(0, tracker.reps)

        listOf(130.0, 90.0, 90.0, 130.0, 170.0, 170.0).forEach(tracker::update)
        assertEquals(1, tracker.reps)
    }

    @Test
    fun testNonFiniteAngleInterruptsPendingCycle() {
        val tracker = RepPhaseTracker(topThreshold = 160.0, bottomThreshold = 100.0, minHoldFrames = 2)
        listOf(170.0, 170.0, 130.0, 90.0, 90.0).forEach(tracker::update)

        val result = tracker.update(Double.NaN)

        assertEquals(RepPhase.START, result.phase)
        assertFalse(result.repCompleted)
        assertEquals(0, result.reps)
    }

    @Test
    fun testRepFormAccumulatorPenalties() {
        val accumulator = RepFormAccumulator(penaltyPerIssue = 20)
        accumulator.tickFrame()
        accumulator.flagIfActive("kneesCavingIn", true)
        accumulator.tickFrame()
        accumulator.flagIfActive("kneesCavingIn", true)

        val result = accumulator.finish()
        assertEquals(80, result.score)
        assertTrue(result.issues.contains("kneesCavingIn"))
    }
}
