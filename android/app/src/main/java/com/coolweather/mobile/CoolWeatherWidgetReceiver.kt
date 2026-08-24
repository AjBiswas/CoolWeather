package com.coolweather.mobile

import android.content.Context
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver

class CoolWeatherWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = CoolWeatherWidget()

    override fun onEnabled(context: Context) {
        super.onEnabled(context)
        WeatherWidgetWorker.enqueuePeriodic(context)
        WeatherWidgetWorker.enqueueImmediate(context)
    }
}
