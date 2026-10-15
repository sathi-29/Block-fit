package com.blockfit.app.data.models

data class RegisterRequest(
    val email: String,
    val username: String,
    val phone: String? = null,
    val password: String,
    val name: String
)

data class LoginRequest(
    val identifier: String? = null,
    val email: String? = null,
    val password: String
)

data class AuthResponse(
    val token: String,
    val user: UserDto
)

data class UserDto(
    val id: String,
    val email: String,
    val username: String,
    val name: String
)

data class ErrorResponse(
    val error: String?
)
