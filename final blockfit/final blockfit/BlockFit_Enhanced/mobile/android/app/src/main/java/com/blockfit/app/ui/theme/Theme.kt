package com.blockfit.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val Slate900 = Color(0xFF0D1117)
val Slate800 = Color(0xFF161B22)
val Slate700 = Color(0xFF21262D)
val Emerald500 = Color(0xFF10B981)
val Cyan500 = Color(0xFF06B6D4)
val Red400 = Color(0xFFEF4444)
val Amber400 = Color(0xFFF59E0B)
val TextPrimary = Color(0xFFF0F6FC)
val TextSecondary = Color(0xFF8B949E)

private val BlockFitColorScheme = darkColorScheme(
    primary = Emerald500,
    onPrimary = Color.Black,
    primaryContainer = Color(0xFF064E3B),
    onPrimaryContainer = Color(0xFFA7F3D0),
    secondary = Cyan500,
    onSecondary = Color.Black,
    background = Slate900,
    onBackground = TextPrimary,
    surface = Slate800,
    onSurface = TextPrimary,
    surfaceVariant = Slate700,
    onSurfaceVariant = TextSecondary,
    error = Red400,
    onError = Color.White
)

@Composable
fun BlockFitTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = BlockFitColorScheme,
        content = content
    )
}
