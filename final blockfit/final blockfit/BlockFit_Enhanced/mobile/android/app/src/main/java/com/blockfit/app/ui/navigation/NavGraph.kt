package com.blockfit.app.ui.navigation

import androidx.compose.runtime.Composable
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.blockfit.app.ui.screens.*
import com.blockfit.app.ui.viewmodels.*

@Composable
fun BlockFitNavGraph(
    navController: NavHostController,
    authViewModel: AuthViewModel = viewModel(),
    dashboardViewModel: DashboardViewModel = viewModel(),
    workoutViewModel: WorkoutViewModel = viewModel(),
    historyViewModel: HistoryViewModel = viewModel(),
    verificationViewModel: VerificationViewModel = viewModel()
) {
    val authUiState = authViewModel.uiState.value
    val startDestination = if (authUiState.isAuthenticated) Screen.Dashboard.route else Screen.Login.route

    NavHost(
        navController = navController,
        startDestination = startDestination
    ) {
        composable(Screen.Login.route) {
            LoginScreen(
                viewModel = authViewModel,
                onNavigateToRegister = { navController.navigate(Screen.Register.route) },
                onLoginSuccess = {
                    navController.navigate(Screen.Dashboard.route) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.Register.route) {
            RegisterScreen(
                viewModel = authViewModel,
                onNavigateToLogin = { navController.popBackStack() },
                onRegisterSuccess = {
                    navController.navigate(Screen.Dashboard.route) {
                        popUpTo(Screen.Register.route) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.Dashboard.route) {
            DashboardScreen(
                viewModel = dashboardViewModel,
                onStartWorkout = { exerciseId ->
                    navController.navigate(Screen.WorkoutCamera.createRoute(exerciseId))
                },
                onNavigateToHistory = { navController.navigate(Screen.History.route) },
                onNavigateToProfile = { navController.navigate(Screen.Profile.route) },
                onNavigateToVerification = { verId ->
                    navController.navigate(Screen.VerificationDetail.createRoute(verId))
                }
            )
        }

        composable(
            route = Screen.WorkoutCamera.route,
            arguments = listOf(navArgument("exerciseId") { type = NavType.StringType })
        ) { backStackEntry ->
            val exerciseId = backStackEntry.arguments?.getString("exerciseId") ?: "squat"
            WorkoutCameraScreen(
                exerciseId = exerciseId,
                viewModel = workoutViewModel,
                onWorkoutEnded = {
                    navController.navigate(Screen.WorkoutSummary.route) {
                        popUpTo(Screen.WorkoutCamera.route) { inclusive = true }
                    }
                },
                onCancel = {
                    navController.popBackStack()
                }
            )
        }

        composable(Screen.WorkoutSummary.route) {
            WorkoutSummaryScreen(
                viewModel = workoutViewModel,
                onNavigateToDashboard = {
                    navController.navigate(Screen.Dashboard.route) {
                        popUpTo(Screen.Dashboard.route) { inclusive = true }
                    }
                },
                onNavigateToVerification = { verId ->
                    navController.navigate(Screen.VerificationDetail.createRoute(verId))
                }
            )
        }

        composable(Screen.History.route) {
            HistoryScreen(
                viewModel = historyViewModel,
                onNavigateBack = { navController.popBackStack() },
                onNavigateToVerification = { verId ->
                    navController.navigate(Screen.VerificationDetail.createRoute(verId))
                }
            )
        }

        composable(Screen.Profile.route) {
            ProfileScreen(
                authViewModel = authViewModel,
                onNavigateBack = { navController.popBackStack() },
                onSignedOut = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }

        composable(
            route = Screen.VerificationDetail.route,
            arguments = listOf(navArgument("verificationId") { type = NavType.StringType })
        ) { backStackEntry ->
            val verificationId = backStackEntry.arguments?.getString("verificationId") ?: ""
            VerificationDetailScreen(
                verificationId = verificationId,
                viewModel = verificationViewModel,
                onNavigateBack = { navController.popBackStack() }
            )
        }
    }
}
