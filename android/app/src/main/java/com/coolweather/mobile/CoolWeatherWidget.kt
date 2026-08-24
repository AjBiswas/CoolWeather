package com.coolweather.mobile

import android.content.Context
import android.content.Intent
import androidx.compose.runtime.Composable
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.LocalContext
import androidx.glance.LocalSize
import androidx.glance.action.ActionParameters
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.SizeMode
import androidx.glance.appwidget.action.ActionCallback
import androidx.glance.appwidget.action.actionRunCallback
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.RowScope
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.size
import androidx.glance.layout.width
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextAlign
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.unit.DpSize
import kotlin.math.roundToInt

private val SMALL = DpSize(110.dp, 110.dp)
private val MEDIUM = DpSize(250.dp, 110.dp)
private val LARGE = DpSize(250.dp, 250.dp)

// Same dark navy the app icon and desktop widget use, so the widget reads as
// unmistakably CoolWeather rather than a generic Android widget.
private val CardBackground = Color(0xFF0A0E18)
private val CardBackgroundLight = Color(0xFF141B2C)
private val PrimaryText = Color(0xFFF5F8FF)
private val SecondaryText = Color(0xFFAAB4CC)

fun iconResForCondition(condition: String, isNight: Boolean): Int {
    if (isNight && condition == "clear") {
        return R.drawable.ic_weather_clear_night
    }
    return when (condition) {
        "clear", "mostly-sunny", "sunset" -> R.drawable.ic_weather_clear
        "partly-cloudy" -> R.drawable.ic_weather_partly_cloudy
        "cloudy" -> R.drawable.ic_weather_cloudy
        "rain" -> R.drawable.ic_weather_rain
        "storm" -> R.drawable.ic_weather_storm
        "snow" -> R.drawable.ic_weather_snow
        "haze" -> R.drawable.ic_weather_haze
        else -> R.drawable.ic_weather_clear
    }
}

fun conditionLabel(condition: String, isNight: Boolean): String {
    return when (condition) {
        "clear" -> if (isNight) "Clear Night" else "Clear Sky"
        "mostly-sunny" -> "Mostly Sunny"
        "partly-cloudy" -> "Partly Cloudy"
        "cloudy" -> "Cloudy"
        "rain" -> "Rainy"
        "storm" -> "Storm"
        "snow" -> "Snow"
        "haze" -> "Haze"
        "sunset" -> "Sunset Glow"
        else -> condition.replaceFirstChar { it.uppercase() }
    }
}

class RefreshWeatherAction : ActionCallback {
    override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: ActionParameters) {
        fetchWeatherWidgetState(context)
        CoolWeatherWidget().update(context, glanceId)
    }
}

class CoolWeatherWidget : GlanceAppWidget() {
    override val sizeMode = SizeMode.Responsive(setOf(SMALL, MEDIUM, LARGE))

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val state = loadCachedWeatherState(context)
        val hasPermission = hasLocationPermission(context)
        provideContent {
            WidgetContent(state, hasPermission)
        }
    }
}

@Composable
private fun WidgetContent(state: WeatherWidgetState?, hasPermission: Boolean) {
    val size = LocalSize.current

    Box(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(CardBackground)
            .cornerRadius(24.dp)
            .clickable(actionRunCallback<RefreshWeatherAction>())
    ) {
        when {
            state == null -> EmptyState(hasPermission)
            size.height <= SMALL.height -> SmallLayout(state)
            size.height <= MEDIUM.height -> MediumLayout(state)
            else -> LargeLayout(state)
        }
    }
}

@Composable
private fun EmptyState(hasPermission: Boolean) {
    val context = LocalContext.current
    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .padding(12.dp)
            .clickable(actionStartActivity(Intent(context, MainActivity::class.java))),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Image(
            provider = ImageProvider(R.drawable.ic_weather_clear),
            contentDescription = null,
            modifier = GlanceModifier.size(36.dp)
        )
        Spacer(modifier = GlanceModifier.height(8.dp))
        Text(
            text = if (hasPermission) "Loading weather..." else "Tap to set up CoolWeather",
            style = TextStyle(color = ColorProvider(PrimaryText), fontSize = 13.sp, textAlign = TextAlign.Center)
        )
    }
}

@Composable
private fun SmallLayout(state: WeatherWidgetState) {
    Column(
        modifier = GlanceModifier.fillMaxSize().padding(10.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Image(
            provider = ImageProvider(iconResForCondition(state.condition, state.isNight)),
            contentDescription = conditionLabel(state.condition, state.isNight),
            modifier = GlanceModifier.size(34.dp)
        )
        Spacer(modifier = GlanceModifier.height(2.dp))
        Text(
            text = "${state.temperatureC.roundToInt()}°",
            style = TextStyle(color = ColorProvider(PrimaryText), fontSize = 26.sp, fontWeight = FontWeight.Bold)
        )
    }
}

@Composable
private fun MediumLayout(state: WeatherWidgetState) {
    Row(
        modifier = GlanceModifier.fillMaxSize().padding(14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Image(
            provider = ImageProvider(iconResForCondition(state.condition, state.isNight)),
            contentDescription = conditionLabel(state.condition, state.isNight),
            modifier = GlanceModifier.size(44.dp)
        )
        Spacer(modifier = GlanceModifier.width(12.dp))
        Column(modifier = GlanceModifier.defaultWeight()) {
            Text(
                text = "${state.temperatureC.roundToInt()}°",
                style = TextStyle(color = ColorProvider(PrimaryText), fontSize = 30.sp, fontWeight = FontWeight.Bold)
            )
            Text(
                text = conditionLabel(state.condition, state.isNight),
                style = TextStyle(color = ColorProvider(PrimaryText), fontSize = 13.sp, fontWeight = FontWeight.Medium)
            )
            Text(
                text = state.cityName,
                style = TextStyle(color = ColorProvider(SecondaryText), fontSize = 12.sp)
            )
        }
    }
}

@Composable
private fun LargeLayout(state: WeatherWidgetState) {
    Column(modifier = GlanceModifier.fillMaxSize().padding(16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Image(
                provider = ImageProvider(iconResForCondition(state.condition, state.isNight)),
                contentDescription = conditionLabel(state.condition, state.isNight),
                modifier = GlanceModifier.size(52.dp)
            )
            Spacer(modifier = GlanceModifier.width(12.dp))
            Column {
                Text(
                    text = "${state.temperatureC.roundToInt()}°",
                    style = TextStyle(color = ColorProvider(PrimaryText), fontSize = 36.sp, fontWeight = FontWeight.Bold)
                )
                Text(
                    text = conditionLabel(state.condition, state.isNight),
                    style = TextStyle(color = ColorProvider(PrimaryText), fontSize = 14.sp, fontWeight = FontWeight.Medium)
                )
            }
        }
        Spacer(modifier = GlanceModifier.height(10.dp))
        Text(
            text = if (state.region.isNotBlank()) "${state.cityName}, ${state.region}" else state.cityName,
            style = TextStyle(color = ColorProvider(SecondaryText), fontSize = 13.sp)
        )
        Spacer(modifier = GlanceModifier.height(14.dp))
        Row(
            modifier = GlanceModifier
                .fillMaxWidth()
                .background(CardBackgroundLight)
                .cornerRadius(14.dp)
                .padding(12.dp)
        ) {
            DetailStat("Feels", "${state.feelsLikeC.roundToInt()}°")
            DetailStat("Humidity", "${state.humidity}%")
            DetailStat("Wind", "${state.windKph.roundToInt()} km/h")
        }
    }
}

@Composable
private fun RowScope.DetailStat(label: String, value: String) {
    Column(modifier = GlanceModifier.defaultWeight(), horizontalAlignment = Alignment.CenterHorizontally) {
        Text(text = value, style = TextStyle(color = ColorProvider(PrimaryText), fontSize = 15.sp, fontWeight = FontWeight.Bold))
        Text(text = label, style = TextStyle(color = ColorProvider(SecondaryText), fontSize = 11.sp))
    }
}
