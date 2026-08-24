package com.coolweather.mobile

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import androidx.glance.appwidget.updateAll
import java.util.concurrent.TimeUnit

class WeatherWidgetWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        fetchWeatherWidgetState(applicationContext)
        CoolWeatherWidget().updateAll(applicationContext)
        return Result.success()
    }

    companion object {
        private const val PERIODIC_WORK_NAME = "coolweather_widget_refresh"
        private const val IMMEDIATE_WORK_NAME = "coolweather_widget_refresh_now"

        fun enqueuePeriodic(context: Context) {
            val request = PeriodicWorkRequestBuilder<WeatherWidgetWorker>(30, TimeUnit.MINUTES).build()
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                PERIODIC_WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                request
            )
        }

        fun enqueueImmediate(context: Context) {
            val request = OneTimeWorkRequestBuilder<WeatherWidgetWorker>().build()
            WorkManager.getInstance(context).enqueueUniqueWork(
                IMMEDIATE_WORK_NAME,
                ExistingWorkPolicy.REPLACE,
                request
            )
        }
    }
}
