package com.blockfit.app.ui.navigation

sealed class Screen(val route: String) {
    object Login : Screen("login")
    object Register : Screen("register")
    object Dashboard : Screen("dashboard")
    object WorkoutCamera : Screen("workout_camera/{exerciseId}") {
        fun createRoute(exerciseId: String) = "workout_camera/$exerciseId"
    }
    object WorkoutSummary : Screen("workout_summary")
    object History : Screen("history")
    object Profile : Screen("profile")
    object VerificationDetail : Screen("verification_detail/{verificationId}") {
        fun createRoute(verificationId: String) = "verification_detail/$verificationId"
    }
}
