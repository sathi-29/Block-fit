package com.blockfit.app.domain

import kotlin.math.abs

data class RepDetail(
    val reps: Int,
    val score: Int,
    val issues: List<String>,
    val issueLabels: List<String>,
    val minKneeAngle: Int? = null,
    val minElbowAngle: Int? = null,
    val holdSeconds: Int? = null,
    val side: String? = null
)

data class AnalysisFrame(
    val exerciseId: String,
    val exerciseName: String,
    val phase: RepPhase,
    val reps: Int,
    val repCompleted: Boolean,
    val repResult: RepDetail?,
    val currentAngle: Int,
    val liveIssues: List<String>,
    val confidence: Float = 0.90f
)

interface ExerciseAnalyzer {
    val id: String
    val label: String
    val topLabel: String
    val bottomLabel: String
    val cameraHint: String

    fun update(landmarks: Map<Int, PosePoint>): AnalysisFrame
    fun onFrameMissing()
    fun reset()
}

// -------------------------------------------------------------------
// 1. SQUAT ANALYZER
// -------------------------------------------------------------------
class SquatAnalyzer : ExerciseAnalyzer {
    override val id = "squat"
    override val label = "Squat"
    override val topLabel = "Standing"
    override val bottomLabel = "Bottom"
    override val cameraHint = "Stand at a 3/4 angle to the camera with full body in frame."

    private val kneeSmoother = Smoother(0.3)
    private val torsoSmoother = Smoother(0.3)
    private val tracker = RepPhaseTracker(topThreshold = 160.0, bottomThreshold = 130.0, minHoldFrames = 2)
    private var repForm = RepFormAccumulator(20)
    private var minKneeAngleThisRep = 180.0

    private fun resetRepAccumulators() {
        repForm = RepFormAccumulator(20)
        minKneeAngleThisRep = 180.0
    }

    override fun reset() {
        kneeSmoother.reset()
        torsoSmoother.reset()
        tracker.reset()
        resetRepAccumulators()
    }

    override fun onFrameMissing() {
        kneeSmoother.reset()
        torsoSmoother.reset()
        tracker.interrupt()
        resetRepAccumulators()
    }

    override fun update(landmarks: Map<Int, PosePoint>): AnalysisFrame {
        val leftKneeAngle = Angles.angleBetween(landmarks[Landmark.LEFT_HIP], landmarks[Landmark.LEFT_KNEE], landmarks[Landmark.LEFT_ANKLE])
        val rightKneeAngle = Angles.angleBetween(landmarks[Landmark.RIGHT_HIP], landmarks[Landmark.RIGHT_KNEE], landmarks[Landmark.RIGHT_ANKLE])
        val kneeAngle = kneeSmoother.update(Angles.averageOrEither(leftKneeAngle, rightKneeAngle))

        val hipMid = Angles.midpoint(landmarks[Landmark.LEFT_HIP], landmarks[Landmark.RIGHT_HIP])
        val shoulderMid = Angles.midpoint(landmarks[Landmark.LEFT_SHOULDER], landmarks[Landmark.RIGHT_SHOULDER])
        val verticalRef = PosePoint(hipMid.x, hipMid.y - 0.15f)
        val torsoLeanRaw = Angles.angleBetween(verticalRef, hipMid, shoulderMid)
        val torsoLean = torsoSmoother.update(torsoLeanRaw)

        val leftKnee = landmarks[Landmark.LEFT_KNEE]
        val rightKnee = landmarks[Landmark.RIGHT_KNEE]
        val leftAnkle = landmarks[Landmark.LEFT_ANKLE]
        val rightAnkle = landmarks[Landmark.RIGHT_ANKLE]

        val kneeGap = if (leftKnee != null && rightKnee != null) abs(leftKnee.x - rightKnee.x) else 0f
        val ankleGap = if (leftAnkle != null && rightAnkle != null) abs(leftAnkle.x - rightAnkle.x) else 0f
        val kneesCavingIn = ankleGap > 0.02f && kneeGap < ankleGap * 0.7f
        val excessiveLean = torsoLean > 45.0

        minKneeAngleThisRep = minOf(minKneeAngleThisRep, kneeAngle)
        repForm.tickFrame()
        repForm.flagIfActive("excessiveForwardLean", excessiveLean)
        repForm.flagIfActive("kneesCavingIn", kneesCavingIn)

        val trackerResult = tracker.update(kneeAngle)

        val liveIssues = mutableListOf<String>()
        if (excessiveLean) liveIssues.add("Keep your chest up")
        if (kneesCavingIn) liveIssues.add("Push your knees out over your toes")

        var repResult: RepDetail? = null
        if (trackerResult.repCompleted) {
            val notLowEnough = minKneeAngleThisRep > 100.0
            val formResult = repForm.finish()
            val issues = formResult.issues.toMutableList()
            var score = formResult.score
            if (notLowEnough) {
                issues.add("notLowEnough")
                score = (score - 20).coerceAtLeast(0)
            }
            repResult = RepDetail(
                reps = trackerResult.reps,
                score = score,
                issues = issues,
                issueLabels = issues.map { getIssueLabel(it) },
                minKneeAngle = minKneeAngleThisRep.toInt()
            )
            resetRepAccumulators()
        }

        return AnalysisFrame(
            exerciseId = id,
            exerciseName = label,
            phase = trackerResult.phase,
            reps = trackerResult.reps,
            repCompleted = trackerResult.repCompleted,
            repResult = repResult,
            currentAngle = kneeAngle.toInt(),
            liveIssues = liveIssues
        )
    }

    private fun getIssueLabel(key: String): String = when (key) {
        "excessiveForwardLean" -> "Chest dropped too far forward"
        "kneesCavingIn" -> "Knees caved inward"
        "notLowEnough" -> "Did not reach full depth"
        else -> key
    }
}

// -------------------------------------------------------------------
// 2. PUSH-UP ANALYZER
// -------------------------------------------------------------------
class PushUpAnalyzer : ExerciseAnalyzer {
    override val id = "pushup"
    override val label = "Push-up"
    override val topLabel = "Arms extended"
    override val bottomLabel = "Chest low"
    override val cameraHint = "Film from the side so your full body line is visible."

    private val elbowSmoother = Smoother(0.3)
    private val tracker = RepPhaseTracker(topThreshold = 155.0, bottomThreshold = 110.0, minHoldFrames = 2)
    private var repForm = RepFormAccumulator(20)
    private var minElbowAngleThisRep = 180.0

    private fun resetRepAccumulators() {
        repForm = RepFormAccumulator(20)
        minElbowAngleThisRep = 180.0
    }

    override fun reset() {
        elbowSmoother.reset()
        tracker.reset()
        resetRepAccumulators()
    }

    override fun onFrameMissing() {
        elbowSmoother.reset()
        tracker.interrupt()
        resetRepAccumulators()
    }

    override fun update(landmarks: Map<Int, PosePoint>): AnalysisFrame {
        val leftElbow = Angles.angleBetween(landmarks[Landmark.LEFT_SHOULDER], landmarks[Landmark.LEFT_ELBOW], landmarks[Landmark.LEFT_WRIST])
        val rightElbow = Angles.angleBetween(landmarks[Landmark.RIGHT_SHOULDER], landmarks[Landmark.RIGHT_ELBOW], landmarks[Landmark.RIGHT_WRIST])
        val elbowAngle = elbowSmoother.update(Angles.averageOrEither(leftElbow, rightElbow))

        val shoulderMid = Angles.midpoint(landmarks[Landmark.LEFT_SHOULDER], landmarks[Landmark.RIGHT_SHOULDER])
        val hipMid = Angles.midpoint(landmarks[Landmark.LEFT_HIP], landmarks[Landmark.RIGHT_HIP])
        val ankleMid = Angles.midpoint(landmarks[Landmark.LEFT_ANKLE], landmarks[Landmark.RIGHT_ANKLE])

        var sagging = false
        var piking = false
        val dx = ankleMid.x - shoulderMid.x
        if (abs(dx) > 0.05f) {
            val t = (hipMid.x - shoulderMid.x) / dx
            val expectedHipY = shoulderMid.y + t * (ankleMid.y - shoulderMid.y)
            val deviation = hipMid.y - expectedHipY
            if (deviation > 0.04f) sagging = true
            else if (deviation < -0.04f) piking = true
        }

        minElbowAngleThisRep = minOf(minElbowAngleThisRep, elbowAngle)
        repForm.tickFrame()
        repForm.flagIfActive("hipsSagging", sagging)
        repForm.flagIfActive("hipsPiking", piking)

        val trackerResult = tracker.update(elbowAngle)

        val liveIssues = mutableListOf<String>()
        if (sagging) liveIssues.add("Engage your core - hips are sagging")
        if (piking) liveIssues.add("Lower your hips into a straight line")

        var repResult: RepDetail? = null
        if (trackerResult.repCompleted) {
            val notLowEnough = minElbowAngleThisRep > 95.0
            val formResult = repForm.finish()
            val issues = formResult.issues.toMutableList()
            var score = formResult.score
            if (notLowEnough) {
                issues.add("notLowEnough")
                score = (score - 20).coerceAtLeast(0)
            }
            repResult = RepDetail(
                reps = trackerResult.reps,
                score = score,
                issues = issues,
                issueLabels = issues.map { getIssueLabel(it) },
                minElbowAngle = minElbowAngleThisRep.toInt()
            )
            resetRepAccumulators()
        }

        return AnalysisFrame(
            exerciseId = id,
            exerciseName = label,
            phase = trackerResult.phase,
            reps = trackerResult.reps,
            repCompleted = trackerResult.repCompleted,
            repResult = repResult,
            currentAngle = elbowAngle.toInt(),
            liveIssues = liveIssues
        )
    }

    private fun getIssueLabel(key: String): String = when (key) {
        "hipsSagging" -> "Hips sagged toward the floor"
        "hipsPiking" -> "Hips piked up too high"
        "notLowEnough" -> "Did not go low enough"
        else -> key
    }
}

// -------------------------------------------------------------------
// 3. BICEP CURL ANALYZER
// -------------------------------------------------------------------
class ArmCurlTracker(val side: String) {
    val elbowSmoother = Smoother(0.3)
    val shoulderAngleSmoother = Smoother(0.3)
    val tracker = RepPhaseTracker(topThreshold = 155.0, bottomThreshold = 70.0, minHoldFrames = 2)
    var repForm = RepFormAccumulator(20)
    var minElbowAngleThisRep = 180.0
    var referenceShoulderAngle: Double? = null

    fun reset() {
        elbowSmoother.reset()
        shoulderAngleSmoother.reset()
        tracker.reset()
        repForm = RepFormAccumulator(20)
        minElbowAngleThisRep = 180.0
        referenceShoulderAngle = null
    }

    fun onFrameMissing() {
        elbowSmoother.reset()
        shoulderAngleSmoother.reset()
        tracker.interrupt()
        repForm = RepFormAccumulator(20)
        minElbowAngleThisRep = 180.0
        referenceShoulderAngle = null
    }

    fun update(landmarks: Map<Int, PosePoint>): AnalysisFrame {
        val sIdx = if (side == "LEFT") Landmark.LEFT_SHOULDER else Landmark.RIGHT_SHOULDER
        val eIdx = if (side == "LEFT") Landmark.LEFT_ELBOW else Landmark.RIGHT_ELBOW
        val wIdx = if (side == "LEFT") Landmark.LEFT_WRIST else Landmark.RIGHT_WRIST
        val hIdx = if (side == "LEFT") Landmark.LEFT_HIP else Landmark.RIGHT_HIP

        val S = landmarks[sIdx]
        val E = landmarks[eIdx]
        val W = landmarks[wIdx]
        val H = landmarks[hIdx]

        val elbowAngle = elbowSmoother.update(Angles.angleBetween(S, E, W))
        val shoulderAngle = shoulderAngleSmoother.update(Angles.angleBetween(H, S, E))

        if (referenceShoulderAngle == null && tracker.phase == RepPhase.TOP) {
            referenceShoulderAngle = shoulderAngle
        }

        val drift = if (referenceShoulderAngle == null) 0.0 else abs(shoulderAngle - referenceShoulderAngle!!)
        val armSwinging = drift > 20.0

        minElbowAngleThisRep = minOf(minElbowAngleThisRep, elbowAngle)
        repForm.tickFrame()
        repForm.flagIfActive("armSwinging", armSwinging)

        val trackerResult = tracker.update(elbowAngle)

        val liveIssues = mutableListOf<String>()
        if (armSwinging) liveIssues.add("Keep your ${side.lowercase()} upper arm still")

        var repResult: RepDetail? = null
        if (trackerResult.repCompleted) {
            val notFullyCurled = minElbowAngleThisRep > 50.0
            val formResult = repForm.finish()
            val issues = formResult.issues.toMutableList()
            var score = formResult.score
            if (notFullyCurled) {
                issues.add("notFullyCurled")
                score = (score - 20).coerceAtLeast(0)
            }
            repResult = RepDetail(
                reps = trackerResult.reps,
                score = score,
                issues = issues,
                issueLabels = issues.map { getIssueLabel(it) },
                minElbowAngle = minElbowAngleThisRep.toInt(),
                side = side
            )
            repForm = RepFormAccumulator(20)
            minElbowAngleThisRep = 180.0
            referenceShoulderAngle = null
        }

        return AnalysisFrame(
            exerciseId = "curl",
            exerciseName = "Bicep Curl",
            phase = trackerResult.phase,
            reps = trackerResult.reps,
            repCompleted = trackerResult.repCompleted,
            repResult = repResult,
            currentAngle = elbowAngle.toInt(),
            liveIssues = liveIssues
        )
    }

    private fun getIssueLabel(key: String): String = when (key) {
        "armSwinging" -> "Upper arm swung - used momentum"
        "notFullyCurled" -> "Did not fully curl"
        else -> key
    }
}

class BicepCurlAnalyzer : ExerciseAnalyzer {
    override val id = "curl"
    override val label = "Bicep Curl"
    override val topLabel = "Arm extended"
    override val bottomLabel = "Fully curled"
    override val cameraHint = "Curl one arm at a time facing the camera for accurate rep counts."

    private val left = ArmCurlTracker("LEFT")
    private val right = ArmCurlTracker("RIGHT")

    override fun reset() {
        left.reset()
        right.reset()
    }

    override fun onFrameMissing() {
        left.onFrameMissing()
        right.onFrameMissing()
    }

    override fun update(landmarks: Map<Int, PosePoint>): AnalysisFrame {
        val l = left.update(landmarks)
        val r = right.update(landmarks)

        val totalReps = left.tracker.reps + right.tracker.reps
        val repResult = l.repResult ?: r.repResult
        val repCompleted = l.repCompleted || r.repCompleted

        val showLeft = l.currentAngle <= r.currentAngle
        val activeFrame = if (showLeft) l else r
        val liveIssues = l.liveIssues + r.liveIssues

        return AnalysisFrame(
            exerciseId = id,
            exerciseName = label,
            phase = activeFrame.phase,
            reps = totalReps,
            repCompleted = repCompleted,
            repResult = repResult,
            currentAngle = activeFrame.currentAngle,
            liveIssues = liveIssues
        )
    }
}

// -------------------------------------------------------------------
// 4. LUNGE ANALYZER
// -------------------------------------------------------------------
class LungeAnalyzer : ExerciseAnalyzer {
    override val id = "lunge"
    override val label = "Lunge"
    override val topLabel = "Standing"
    override val bottomLabel = "Bottom"
    override val cameraHint = "Stand at a 3/4 angle with full body visible. Step forward into each lunge."

    private val kneeSmoother = Smoother(0.3)
    private val torsoSmoother = Smoother(0.3)
    private val tracker = RepPhaseTracker(topThreshold = 160.0, bottomThreshold = 125.0, minHoldFrames = 3)
    private var repForm = RepFormAccumulator(20)
    private var minKneeAngleThisRep = 180.0

    override fun reset() {
        kneeSmoother.reset()
        torsoSmoother.reset()
        tracker.reset()
        repForm = RepFormAccumulator(20)
        minKneeAngleThisRep = 180.0
    }

    override fun onFrameMissing() {
        kneeSmoother.reset()
        torsoSmoother.reset()
        tracker.interrupt()
        repForm = RepFormAccumulator(20)
        minKneeAngleThisRep = 180.0
    }

    override fun update(landmarks: Map<Int, PosePoint>): AnalysisFrame {
        val leftKnee = Angles.angleBetween(landmarks[Landmark.LEFT_HIP], landmarks[Landmark.LEFT_KNEE], landmarks[Landmark.LEFT_ANKLE])
        val rightKnee = Angles.angleBetween(landmarks[Landmark.RIGHT_HIP], landmarks[Landmark.RIGHT_KNEE], landmarks[Landmark.RIGHT_ANKLE])
        val kneeAngle = kneeSmoother.update(Angles.averageOrEither(leftKnee, rightKnee))

        val hipMid = Angles.midpoint(landmarks[Landmark.LEFT_HIP], landmarks[Landmark.RIGHT_HIP])
        val shoulderMid = Angles.midpoint(landmarks[Landmark.LEFT_SHOULDER], landmarks[Landmark.RIGHT_SHOULDER])
        val verticalRef = PosePoint(hipMid.x, hipMid.y - 0.15f)
        val torsoLean = torsoSmoother.update(Angles.angleBetween(verticalRef, hipMid, shoulderMid))
        val excessiveLean = torsoLean > 42.0

        minKneeAngleThisRep = minOf(minKneeAngleThisRep, kneeAngle)
        repForm.tickFrame()
        repForm.flagIfActive("excessiveForwardLean", excessiveLean)

        val trackerResult = tracker.update(kneeAngle)
        val liveIssues = if (excessiveLean) listOf("Keep your chest up") else emptyList()

        var repResult: RepDetail? = null
        if (trackerResult.repCompleted) {
            val issues = repForm.finish().issues.toMutableList()
            val notLowEnough = minKneeAngleThisRep > 105.0
            if (notLowEnough) issues.add("notLowEnough")
            val score = (100 - issues.size * 20).coerceAtLeast(0)
            repResult = RepDetail(
                reps = trackerResult.reps,
                score = score,
                issues = issues,
                issueLabels = issues.map { getIssueLabel(it) },
                minKneeAngle = minKneeAngleThisRep.toInt()
            )
            repForm = RepFormAccumulator(20)
            minKneeAngleThisRep = 180.0
        }

        return AnalysisFrame(
            exerciseId = id,
            exerciseName = label,
            phase = trackerResult.phase,
            reps = trackerResult.reps,
            repCompleted = trackerResult.repCompleted,
            repResult = repResult,
            currentAngle = kneeAngle.toInt(),
            liveIssues = liveIssues
        )
    }

    private fun getIssueLabel(key: String): String = when (key) {
        "excessiveForwardLean" -> "Chest dropped too far forward"
        "notLowEnough" -> "Did not reach full lunge depth"
        else -> key
    }
}

// -------------------------------------------------------------------
// 5. PLANK ANALYZER
// -------------------------------------------------------------------
class PlankAnalyzer : ExerciseAnalyzer {
    override val id = "plank"
    override val label = "Plank Hold"
    override val topLabel = "Ready"
    override val bottomLabel = "Holding"
    override val cameraHint = "Film from the side with shoulders, hips, and ankles visible."

    private val lineSmoother = Smoother(0.3)
    private var holdStartedAt: Long? = null
    private var completed = false
    private var repForm = RepFormAccumulator(20)

    override fun reset() {
        lineSmoother.reset()
        holdStartedAt = null
        completed = false
        repForm = RepFormAccumulator(20)
    }

    override fun onFrameMissing() {
        lineSmoother.reset()
        if (!completed) {
            holdStartedAt = null
            repForm = RepFormAccumulator(20)
        }
    }

    override fun update(landmarks: Map<Int, PosePoint>): AnalysisFrame {
        val shoulder = Angles.midpoint(landmarks[Landmark.LEFT_SHOULDER], landmarks[Landmark.RIGHT_SHOULDER])
        val hip = Angles.midpoint(landmarks[Landmark.LEFT_HIP], landmarks[Landmark.RIGHT_HIP])
        val ankle = Angles.midpoint(landmarks[Landmark.LEFT_ANKLE], landmarks[Landmark.RIGHT_ANKLE])

        val dx = ankle.x - shoulder.x
        val t = if (abs(dx) > 0.05f) (hip.x - shoulder.x) / dx else 0.5f
        val expectedHipY = shoulder.y + t * (ankle.y - shoulder.y)
        val deviation = lineSmoother.update(abs(hip.y - expectedHipY).toDouble())
        val poorLine = deviation > 0.055

        val now = System.currentTimeMillis()

        if (!poorLine && !completed) {
            if (holdStartedAt == null) holdStartedAt = now
            repForm.tickFrame()
            repForm.flagIfActive("bodyLineBroken", poorLine)
        } else if (poorLine) {
            holdStartedAt = null
        }

        val holdSeconds = if (holdStartedAt == null) 0 else ((now - holdStartedAt!!) / 1000).toInt()
        val repCompleted = !completed && holdSeconds >= 3

        var repResult: RepDetail? = null
        if (repCompleted) {
            completed = true
            val formResult = repForm.finish()
            repResult = RepDetail(
                reps = 1,
                score = formResult.score,
                issues = formResult.issues,
                issueLabels = listOf("Body line was not stable"),
                holdSeconds = holdSeconds
            )
        }

        return AnalysisFrame(
            exerciseId = id,
            exerciseName = label,
            phase = if (poorLine) RepPhase.TOP else RepPhase.BOTTOM,
            reps = if (completed) 1 else 0,
            repCompleted = repCompleted,
            repResult = repResult,
            currentAngle = (deviation * 100).toInt(),
            liveIssues = if (poorLine) listOf("Keep shoulders, hips, and ankles in one line") else emptyList()
        )
    }
}

// -------------------------------------------------------------------
// FACTORY
// -------------------------------------------------------------------
fun createExerciseAnalyzer(id: String): ExerciseAnalyzer {
    return when (id.lowercase()) {
        "squat" -> SquatAnalyzer()
        "pushup", "push-up" -> PushUpAnalyzer()
        "curl", "bicepcurl", "bicep-curl" -> BicepCurlAnalyzer()
        "lunge" -> LungeAnalyzer()
        "plank" -> PlankAnalyzer()
        else -> SquatAnalyzer()
    }
}
