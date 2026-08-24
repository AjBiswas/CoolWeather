package com.coolweather.mobile

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import kotlinx.coroutines.tasks.await
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

/** Mirrors the WeatherCondition union in src/types.ts. */
data class WeatherWidgetState(
    val temperatureC: Double,
    val feelsLikeC: Double,
    val condition: String,
    val isNight: Boolean,
    val cityName: String,
    val region: String,
    val humidity: Int,
    val windKph: Double,
    val updatedAtMillis: Long
)

private const val PREFS_NAME = "coolweather_widget_prefs"
private const val KEY_STATE = "last_state"
private const val KEY_LAT = "last_lat"
private const val KEY_LON = "last_lon"

fun hasLocationPermission(context: Context): Boolean {
    val fine = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION)
    val coarse = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION)
    return fine == PackageManager.PERMISSION_GRANTED || coarse == PackageManager.PERMISSION_GRANTED
}

fun loadCachedWeatherState(context: Context): WeatherWidgetState? {
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val raw = prefs.getString(KEY_STATE, null) ?: return null
    return try {
        val json = JSONObject(raw)
        WeatherWidgetState(
            temperatureC = json.getDouble("temperatureC"),
            feelsLikeC = json.getDouble("feelsLikeC"),
            condition = json.getString("condition"),
            isNight = json.getBoolean("isNight"),
            cityName = json.getString("cityName"),
            region = json.optString("region", ""),
            humidity = json.getInt("humidity"),
            windKph = json.getDouble("windKph"),
            updatedAtMillis = json.getLong("updatedAtMillis")
        )
    } catch (e: Exception) {
        null
    }
}

private fun saveWeatherState(context: Context, state: WeatherWidgetState) {
    val json = JSONObject().apply {
        put("temperatureC", state.temperatureC)
        put("feelsLikeC", state.feelsLikeC)
        put("condition", state.condition)
        put("isNight", state.isNight)
        put("cityName", state.cityName)
        put("region", state.region)
        put("humidity", state.humidity)
        put("windKph", state.windKph)
        put("updatedAtMillis", state.updatedAtMillis)
    }
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        .edit()
        .putString(KEY_STATE, json.toString())
        .apply()
}

private fun saveLastLocation(context: Context, lat: Double, lon: Double) {
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        .edit()
        .putString(KEY_LAT, lat.toString())
        .putString(KEY_LON, lon.toString())
        .apply()
}

private fun loadLastLocation(context: Context): Pair<Double, Double>? {
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val lat = prefs.getString(KEY_LAT, null)?.toDoubleOrNull() ?: return null
    val lon = prefs.getString(KEY_LON, null)?.toDoubleOrNull() ?: return null
    return lat to lon
}

private fun httpGetJson(url: String): JSONObject {
    val connection = URL(url).openConnection() as HttpURLConnection
    connection.connectTimeout = 10_000
    connection.readTimeout = 10_000
    connection.requestMethod = "GET"
    try {
        val code = connection.responseCode
        if (code != 200) {
            throw RuntimeException("HTTP $code for $url")
        }
        val body = connection.inputStream.bufferedReader().use { it.readText() }
        return JSONObject(body)
    } finally {
        connection.disconnect()
    }
}

/** Mirrors toCondition() in src/lib/liveWeather.ts. */
private fun weatherCodeToCondition(code: Int): String {
    return when {
        code == 0 -> "clear"
        code == 1 -> "mostly-sunny"
        code == 2 -> "partly-cloudy"
        code == 45 || code == 48 -> "haze"
        code == 3 -> "cloudy"
        code in intArrayOf(71, 73, 75, 77, 85, 86) -> "snow"
        code in intArrayOf(95, 96, 99) -> "storm"
        code in intArrayOf(51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82) -> "rain"
        else -> "clear"
    }
}

private suspend fun resolveLocation(context: Context): Pair<Double, Double>? {
    if (!hasLocationPermission(context)) {
        return loadLastLocation(context)
    }
    return try {
        val client = LocationServices.getFusedLocationProviderClient(context)
        val location = client.getCurrentLocation(Priority.PRIORITY_BALANCED_POWER_ACCURACY, null).await()
        if (location != null) {
            saveLastLocation(context, location.latitude, location.longitude)
            location.latitude to location.longitude
        } else {
            loadLastLocation(context)
        }
    } catch (e: Exception) {
        loadLastLocation(context)
    }
}

suspend fun fetchWeatherWidgetState(context: Context): WeatherWidgetState? {
    val (lat, lon) = resolveLocation(context) ?: return null

    return try {
        val forecastUrl = "https://api.open-meteo.com/v1/forecast" +
            "?latitude=$lat&longitude=$lon" +
            "&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code,is_day" +
            "&timezone=auto"
        val forecast = httpGetJson(forecastUrl)
        val current = forecast.getJSONObject("current")

        var cityName = "Current Location"
        var region = ""
        try {
            val encodedLat = URLEncoder.encode(lat.toString(), "UTF-8")
            val encodedLon = URLEncoder.encode(lon.toString(), "UTF-8")
            val geocodeUrl = "https://geocoding-api.open-meteo.com/v1/reverse" +
                "?latitude=$encodedLat&longitude=$encodedLon&language=en&format=json"
            val geocode = httpGetJson(geocodeUrl)
            val results = geocode.optJSONArray("results")
            if (results != null && results.length() > 0) {
                val place = results.getJSONObject(0)
                cityName = place.optString("name", cityName)
                region = place.optString("admin1", place.optString("country", ""))
            }
        } catch (e: Exception) {
            // Keep the generic city name if reverse geocoding fails.
        }

        val state = WeatherWidgetState(
            temperatureC = current.getDouble("temperature_2m"),
            feelsLikeC = current.getDouble("apparent_temperature"),
            condition = weatherCodeToCondition(current.getInt("weather_code")),
            isNight = current.getInt("is_day") == 0,
            cityName = cityName,
            region = region,
            humidity = current.getInt("relative_humidity_2m"),
            windKph = current.getDouble("wind_speed_10m"),
            updatedAtMillis = System.currentTimeMillis()
        )
        saveWeatherState(context, state)
        state
    } catch (e: Exception) {
        null
    }
}
