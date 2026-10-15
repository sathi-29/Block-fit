package com.blockfit.app.data.api

import android.content.Context
import com.blockfit.app.data.NetworkConfig
import com.blockfit.app.data.TokenManager
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {
    private var apiService: BlockFitApiService? = null
    private var lastBaseUrl: String? = null

    fun getService(context: Context): BlockFitApiService {
        val currentBaseUrl = NetworkConfig.getBaseUrl(context)
        if (apiService == null || lastBaseUrl != currentBaseUrl) {
            val loggingInterceptor = HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            }

            val authInterceptor = Interceptor { chain ->
                val requestBuilder = chain.request().newBuilder()
                val token = TokenManager.getToken(context)
                if (!token.isNullOrEmpty()) {
                    requestBuilder.addHeader("Authorization", "Bearer $token")
                }
                chain.proceed(requestBuilder.build())
            }

            val okHttpClient = OkHttpClient.Builder()
                .addInterceptor(authInterceptor)
                .addInterceptor(loggingInterceptor)
                .connectTimeout(15, TimeUnit.SECONDS)
                .readTimeout(15, TimeUnit.SECONDS)
                .build()

            val retrofit = Retrofit.Builder()
                .baseUrl(currentBaseUrl)
                .client(okHttpClient)
                .addConverterFactory(GsonConverterFactory.create())
                .build()

            apiService = retrofit.create(BlockFitApiService::class.java)
            lastBaseUrl = currentBaseUrl
        }
        return apiService!!
    }

    fun resetClient() {
        apiService = null
        lastBaseUrl = null
    }
}
