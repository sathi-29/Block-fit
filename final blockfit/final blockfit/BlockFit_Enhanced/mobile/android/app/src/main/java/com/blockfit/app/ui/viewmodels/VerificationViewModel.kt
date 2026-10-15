package com.blockfit.app.ui.viewmodels

import android.app.Application
import android.graphics.Bitmap
import android.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.blockfit.app.data.api.ApiClient
import com.blockfit.app.data.NetworkConfig
import com.blockfit.app.data.models.PublicVerificationResponse
import com.google.zxing.BarcodeFormat
import com.google.zxing.qrcode.QRCodeWriter
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

data class VerificationUiState(
    val isLoading: Boolean = false,
    val record: PublicVerificationResponse? = null,
    val qrCodeBitmap: ImageBitmap? = null,
    val errorMessage: String? = null
)

class VerificationViewModel(application: Application) : AndroidViewModel(application) {

    private val _uiState = MutableStateFlow(VerificationUiState())
    val uiState: StateFlow<VerificationUiState> = _uiState.asStateFlow()

    fun loadVerification(verificationId: String) {
        if (verificationId.isBlank()) return

        val app = getApplication<Application>()
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            try {
                val api = ApiClient.getService(app)
                val response = api.getPublicVerification(verificationId.trim())
                if (response.isSuccessful && response.body() != null) {
                    val publicRecord = response.body()!!
                    val baseUrl = NetworkConfig.getBaseUrl(app)
                    val verificationUrl = "${baseUrl}verification/public/${publicRecord.verificationId}"
                    val qrBitmap = generateQrCode(verificationUrl)

                    _uiState.value = VerificationUiState(
                        isLoading = false,
                        record = publicRecord,
                        qrCodeBitmap = qrBitmap
                    )
                } else {
                    val statusMsg = if (response.code() == 410) {
                        "This verification has been revoked or expired"
                    } else if (response.code() == 404) {
                        "Verification record not found"
                    } else {
                        "Failed to load verification detail"
                    }
                    _uiState.value = _uiState.value.copy(isLoading = false, errorMessage = statusMsg)
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    errorMessage = e.localizedMessage ?: "Network error fetching verification"
                )
            }
        }
    }

    private suspend fun generateQrCode(content: String, size: Int = 512): ImageBitmap? {
        return withContext(Dispatchers.Default) {
            try {
                val writer = QRCodeWriter()
                val bitMatrix = writer.encode(content, BarcodeFormat.QR_CODE, size, size)
                val width = bitMatrix.width
                val height = bitMatrix.height
                val bmp = Bitmap.createBitmap(width, height, Bitmap.Config.RGB_565)
                for (x in 0 until width) {
                    for (y in 0 until height) {
                        bmp.setPixel(x, y, if (bitMatrix[x, y]) Color.BLACK else Color.WHITE)
                    }
                }
                bmp.asImageBitmap()
            } catch (e: Exception) {
                null
            }
        }
    }
}
