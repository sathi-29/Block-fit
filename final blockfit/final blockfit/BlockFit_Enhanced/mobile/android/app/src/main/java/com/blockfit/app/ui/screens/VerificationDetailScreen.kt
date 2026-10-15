package com.blockfit.app.ui.screens

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.blockfit.app.ui.viewmodels.VerificationViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VerificationDetailScreen(
    verificationId: String,
    viewModel: VerificationViewModel,
    onNavigateBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    var lookupInput by remember { mutableStateOf(verificationId) }

    LaunchedEffect(verificationId) {
        viewModel.loadVerification(verificationId)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Verification & QR Proof", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(paddingValues)
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Lookup Bar
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                shape = RoundedCornerShape(12.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedTextField(
                        value = lookupInput,
                        onValueChange = { lookupInput = it },
                        label = { Text("Verification ID") },
                        singleLine = true,
                        modifier = Modifier.weight(1f)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    IconButton(
                        onClick = { viewModel.loadVerification(lookupInput) },
                        modifier = Modifier.background(MaterialTheme.colorScheme.primary, RoundedCornerShape(8.dp))
                    ) {
                        Icon(Icons.Default.Search, contentDescription = "Search", tint = Color.Black)
                    }
                }
            }

            if (uiState.isLoading) {
                Box(modifier = Modifier.fillMaxWidth().height(200.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            } else if (uiState.errorMessage != null) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Error, contentDescription = null, tint = MaterialTheme.colorScheme.error)
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(text = uiState.errorMessage!!, color = MaterialTheme.colorScheme.onErrorContainer)
                    }
                }
            } else if (uiState.record != null) {
                val record = uiState.record!!

                // QR Code Display Card
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(20.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        if (uiState.qrCodeBitmap != null) {
                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                color = Color.White,
                                modifier = Modifier.padding(8.dp)
                            ) {
                                Image(
                                    bitmap = uiState.qrCodeBitmap!!,
                                    contentDescription = "Verification QR Code",
                                    modifier = Modifier.size(200.dp)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        AssistChip(
                            onClick = { },
                            label = { Text(record.verificationStatus) },
                            leadingIcon = { Icon(Icons.Default.Verified, contentDescription = null, tint = MaterialTheme.colorScheme.primary) }
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        Text(
                            text = "${record.workout.uppercase()} • ${record.validReps} Reps • ${record.score.toInt()}% Form",
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp
                        )
                        Text(
                            text = "Timestamp: ${record.serverTimestamp.take(19).replace("T", " ")}",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                // Integrity Hash Card
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(text = "SHA-256 Canonical Hash", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = record.hash,
                            fontFamily = FontFamily.Monospace,
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.secondary
                        )
                    }
                }

                // Claims Disclaimer Card
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(text = "Verification Scope & Claims", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        Spacer(modifier = Modifier.height(8.dp))

                        Text(text = "ATTESTS TO:", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = MaterialTheme.colorScheme.primary)
                        record.claims?.attestsTo?.forEach { claim ->
                            Row(modifier = Modifier.padding(vertical = 2.dp)) {
                                Text(text = "• ", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                                Text(text = claim, fontSize = 12.sp)
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        Text(text = "DOES NOT ATTEST TO:", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = MaterialTheme.colorScheme.error)
                        record.claims?.doesNotAttestTo?.forEach { claim ->
                            Row(modifier = Modifier.padding(vertical = 2.dp)) {
                                Text(text = "• ", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.error)
                                Text(text = claim, fontSize = 12.sp)
                            }
                        }
                    }
                }
            }
        }
    }
}
