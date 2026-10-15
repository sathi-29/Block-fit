package com.blockfit.app.camera

import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import com.blockfit.app.domain.*
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.pose.Pose
import com.google.mlkit.vision.pose.PoseDetection
import com.google.mlkit.vision.pose.PoseLandmark
import com.google.mlkit.vision.pose.defaults.PoseDetectorOptions

data class PoseDetectionState(
    val frame: AnalysisFrame?,
    val landmarks: Map<Int, PosePoint>,
    val personDetected: Boolean,
    val isLowConfidence: Boolean,
    val errorMessage: String? = null
)

class PoseDetectorEngine(
    private var activeAnalyzer: ExerciseAnalyzer,
    private val onStateUpdated: (PoseDetectionState) -> Unit
) : ImageAnalysis.Analyzer {

    private val options = PoseDetectorOptions.Builder()
        .setDetectorMode(PoseDetectorOptions.STREAM_MODE)
        .build()

    private val detector = PoseDetection.getClient(options)
    private var isProcessing = false

    fun setAnalyzer(analyzer: ExerciseAnalyzer) {
        this.activeAnalyzer = analyzer
        this.activeAnalyzer.reset()
    }

    @androidx.annotation.OptIn(androidx.camera.core.ExperimentalGetImage::class)
    override fun analyze(imageProxy: ImageProxy) {
        val mediaImage = imageProxy.image
        if (mediaImage == null || isProcessing) {
            imageProxy.close()
            return
        }

        isProcessing = true
        val rotationDegrees = imageProxy.imageInfo.rotationDegrees
        val image = InputImage.fromMediaImage(mediaImage, rotationDegrees)

        detector.process(image)
            .addOnSuccessListener { pose ->
                processPose(pose, imageProxy.width, imageProxy.height, rotationDegrees)
            }
            .addOnFailureListener { error ->
                onStateUpdated(
                    PoseDetectionState(
                        frame = null,
                        landmarks = emptyMap(),
                        personDetected = false,
                        isLowConfidence = false,
                        errorMessage = error.localizedMessage ?: "Pose detection error"
                    )
                )
            }
            .addOnCompleteListener {
                isProcessing = false
                imageProxy.close()
            }
    }

    private fun processPose(pose: Pose, imageWidth: Int, imageHeight: Int, rotationDegrees: Int) {
        val allLandmarks = pose.allPoseLandmarks
        if (allLandmarks.isEmpty()) {
            onStateUpdated(
                PoseDetectionState(
                    frame = null,
                    landmarks = emptyMap(),
                    personDetected = false,
                    isLowConfidence = false
                )
            )
            return
        }

        val landmarkMap = mutableMapOf<Int, PosePoint>()
        var totalConfidence = 0f
        var count = 0

        for (lm in allLandmarks) {
            val type = lm.landmarkType
            val position = lm.position
            // Normalize x and y to [0.0, 1.0] range
            var normX = position.x / imageWidth.toFloat()
            var normY = position.y / imageHeight.toFloat()

            // Adjust for portrait orientation if rotated 90 or 270 degrees
            if (rotationDegrees == 90 || rotationDegrees == 270) {
                normX = position.x / imageHeight.toFloat()
                normY = position.y / imageWidth.toFloat()
            }

            val likelihood = lm.inFrameLikelihood
            landmarkMap[type] = PosePoint(normX, normY, likelihood)
            totalConfidence += likelihood
            count++
        }

        val avgConfidence = if (count > 0) totalConfidence / count else 0f
        val isLowConfidence = avgConfidence < 0.50f

        if (isLowConfidence) {
            onStateUpdated(
                PoseDetectionState(
                    frame = null,
                    landmarks = landmarkMap,
                    personDetected = true,
                    isLowConfidence = true
                )
            )
            return
        }

        val frame = activeAnalyzer.update(landmarkMap)

        onStateUpdated(
            PoseDetectionState(
                frame = frame,
                landmarks = landmarkMap,
                personDetected = true,
                isLowConfidence = false
            )
        )
    }

    fun close() {
        try {
            detector.close()
        } catch (e: Exception) {
            // Ignored
        }
    }
}
