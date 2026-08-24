import type { WeatherSnapshot } from "../types";

export const mockWeatherByCity: Record<string, WeatherSnapshot> = {
  delhi: {
    city: "Delhi",
    region: "India",
    temperatureC: 31,
    feelsLikeC: 34,
    humidity: 42,
    windKph: 16,
    uvIndex: 5,
    condition: "sunset",
    summary: "Warm evening light with dusty haze rolling across the skyline.",
    updatedAt: "6:40 PM",
    live: false,
    forecast: [
      { label: "Now", temperatureC: 31, condition: "sunset" },
      { label: "9 PM", temperatureC: 28, condition: "cloudy" },
      { label: "12 AM", temperatureC: 26, condition: "clear" },
      { label: "3 AM", temperatureC: 24, condition: "clear" }
    ],
    hourlyDetails: [
      { label: "Now", temperatureC: 31, condition: "sunset", isNight: false, windKph: 16, uvIndex: 5 },
      { label: "7 PM", temperatureC: 30, condition: "sunset", isNight: false, windKph: 15, uvIndex: 3 },
      { label: "8 PM", temperatureC: 29, condition: "cloudy", isNight: true, windKph: 14, uvIndex: 1 },
      { label: "9 PM", temperatureC: 28, condition: "cloudy", isNight: true, windKph: 14, uvIndex: 0 },
      { label: "10 PM", temperatureC: 27, condition: "clear", isNight: true, windKph: 13, uvIndex: 0 },
      { label: "11 PM", temperatureC: 26, condition: "clear", isNight: true, windKph: 12, uvIndex: 0 }
    ]
  },
  london: {
    city: "London",
    region: "United Kingdom",
    temperatureC: 13,
    feelsLikeC: 11,
    humidity: 74,
    windKph: 21,
    uvIndex: 2,
    condition: "rain",
    summary: "Steady rainfall with a cool breeze and fast-moving low clouds.",
    updatedAt: "2:15 PM",
    live: false,
    forecast: [
      { label: "Now", temperatureC: 13, condition: "rain" },
      { label: "5 PM", temperatureC: 12, condition: "rain" },
      { label: "8 PM", temperatureC: 11, condition: "cloudy" },
      { label: "11 PM", temperatureC: 10, condition: "cloudy" }
    ],
    hourlyDetails: [
      { label: "Now", temperatureC: 13, condition: "rain", isNight: false, windKph: 21, uvIndex: 2 },
      { label: "3 PM", temperatureC: 13, condition: "rain", isNight: false, windKph: 22, uvIndex: 1 },
      { label: "4 PM", temperatureC: 12, condition: "rain", isNight: false, windKph: 23, uvIndex: 1 },
      { label: "5 PM", temperatureC: 12, condition: "rain", isNight: false, windKph: 21, uvIndex: 0 },
      { label: "6 PM", temperatureC: 11, condition: "cloudy", isNight: false, windKph: 18, uvIndex: 0 },
      { label: "7 PM", temperatureC: 11, condition: "cloudy", isNight: true, windKph: 17, uvIndex: 0 }
    ]
  },
  tokyo: {
    city: "Tokyo",
    region: "Japan",
    temperatureC: 8,
    feelsLikeC: 5,
    humidity: 58,
    windKph: 13,
    uvIndex: 1,
    condition: "snow",
    summary: "Fine snow drifting across a crisp night with bright city glow.",
    updatedAt: "11:05 PM",
    live: false,
    forecast: [
      { label: "Now", temperatureC: 8, condition: "snow" },
      { label: "2 AM", temperatureC: 6, condition: "snow" },
      { label: "5 AM", temperatureC: 4, condition: "cloudy" },
      { label: "8 AM", temperatureC: 7, condition: "clear" }
    ],
    hourlyDetails: [
      { label: "Now", temperatureC: 8, condition: "snow", isNight: true, windKph: 13, uvIndex: 1 },
      { label: "12 AM", temperatureC: 7, condition: "snow", isNight: true, windKph: 12, uvIndex: 0 },
      { label: "1 AM", temperatureC: 7, condition: "snow", isNight: true, windKph: 11, uvIndex: 0 },
      { label: "2 AM", temperatureC: 6, condition: "snow", isNight: true, windKph: 10, uvIndex: 0 },
      { label: "3 AM", temperatureC: 5, condition: "cloudy", isNight: true, windKph: 9, uvIndex: 0 },
      { label: "4 AM", temperatureC: 4, condition: "cloudy", isNight: true, windKph: 9, uvIndex: 0 }
    ]
  },
  seattle: {
    city: "Seattle",
    region: "United States",
    temperatureC: 10,
    feelsLikeC: 8,
    humidity: 81,
    windKph: 18,
    uvIndex: 1,
    condition: "storm",
    summary: "A dramatic front is passing through with thunder and dense cloud cover.",
    updatedAt: "9:20 AM",
    live: false,
    forecast: [
      { label: "Now", temperatureC: 10, condition: "storm" },
      { label: "12 PM", temperatureC: 11, condition: "rain" },
      { label: "3 PM", temperatureC: 12, condition: "cloudy" },
      { label: "6 PM", temperatureC: 10, condition: "rain" }
    ],
    hourlyDetails: [
      { label: "Now", temperatureC: 10, condition: "storm", isNight: false, windKph: 18, uvIndex: 1 },
      { label: "10 AM", temperatureC: 10, condition: "rain", isNight: false, windKph: 19, uvIndex: 1 },
      { label: "11 AM", temperatureC: 11, condition: "rain", isNight: false, windKph: 20, uvIndex: 2 },
      { label: "12 PM", temperatureC: 11, condition: "rain", isNight: false, windKph: 21, uvIndex: 2 },
      { label: "1 PM", temperatureC: 12, condition: "cloudy", isNight: false, windKph: 18, uvIndex: 1 },
      { label: "2 PM", temperatureC: 12, condition: "cloudy", isNight: false, windKph: 17, uvIndex: 1 }
    ]
  }
};

export const fallbackWeather = mockWeatherByCity.delhi;
