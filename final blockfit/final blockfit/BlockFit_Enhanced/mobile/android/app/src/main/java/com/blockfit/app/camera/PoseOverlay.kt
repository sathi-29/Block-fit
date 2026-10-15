package com.blockfit.app.camera

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import com.blockfit.app.domain.Landmark
import com.blockfit.app.domain.PosePoint

@Composable
fun PoseOverlay(
    landmarks: Map<Int, PosePoint>,
    modifier: Modifier = Modifier,
    lineColor: Color = Color(0xFF10B981), // Emerald
    jointColor: Color = Color(0xFF06B6D4) // Cyan
) {
    Canvas(modifier = modifier.fillMaxSize()) {
        val width = size.width
        val height = size.height

        // Draw connections
        for ((startIdx, endIdx) in Landmark.POSE_CONNECTIONS) {
            val start = landmarks[startIdx]
            val end = landmarks[endIdx]

            if (start != null && end != null && start.visibility > 0.4f && end.visibility > 0.4f) {
                drawLine(
                    color = lineColor,
                    start = Offset(start.x * width, start.y * height),
                    end = Offset(end.x * width, end.y * height),
                    strokeWidth = 6f,
                    cap = StrokeCap.Round
                )
            }
        }

        // Draw keypoint joints
        for ((_, point) in landmarks) {
            if (point.visibility > 0.4f) {
                drawCircle(
                    color = jointColor,
                    radius = 8f,
                    center = Offset(point.x * width, point.y * height)
                )
            }
        }
    }
}
