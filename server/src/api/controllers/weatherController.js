import { getFarmerByUserId } from "../models/farmerModel.js";
import { listLandsByFarmer } from "../models/landModel.js";
import { getLand, saveWeatherSnapshot } from "../models/weatherModel.js";
import { getWeatherForLand } from "../services/weatherService.js";

const cachedWeather = new Map();

export async function weatherForLand(req, res, next) {
  try {
    const land = await getLand(req.params.landId);
    if (!land) return res.status(404).json({ message: "Land was not found." });
    const weather = await getWeatherForLand(land.latitude, land.longitude);
    if (!weather) return res.status(503).json({ message: "Weather service has not been configured yet." });
    res.json({ snapshot: await saveWeatherSnapshot(land.id, weather) });
  } catch (error) { next(error); }
}

function weatherUrl(latitude, longitude) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: String(latitude), longitude: String(longitude),
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max",
    forecast_days: "1", timezone: "Asia/Manila",
  });
  return url;
}

async function currentWeather(latitude, longitude, location) {
  const cacheKey = `${Number(latitude).toFixed(4)},${Number(longitude).toFixed(4)}`;
  try {
    const response = await fetch(weatherUrl(latitude, longitude), { signal: AbortSignal.timeout(12_000), headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Live weather service returned ${response.status}.`);
    const data = await response.json();
    if (!data?.current || !data?.daily?.time?.length) throw new Error("Live weather service returned incomplete data.");
    const payload = {
      location,
      coordinates: { latitude: data.latitude, longitude: data.longitude },
      observedAt: data.current.time || null,
      fetchedAt: new Date().toISOString(),
      weather: data.current,
      today: {
        date: data.daily.time[0], weatherCode: data.daily.weather_code[0],
        temperatureMax: data.daily.temperature_2m_max[0], temperatureMin: data.daily.temperature_2m_min[0],
        rainChance: data.daily.precipitation_probability_max[0], rainTotal: data.daily.precipitation_sum[0], windMax: data.daily.wind_speed_10m_max[0],
      },
      stale: false, notice: null,
    };
    cachedWeather.set(cacheKey, payload);
    return payload;
  } catch (error) {
    const cached = cachedWeather.get(cacheKey);
    if (cached) return { ...cached, stale: true, notice: "Live weather is temporarily unavailable. Showing the most recently retrieved conditions for this location." };
    throw error;
  }
}

export async function bongabongWeather(_req, res, next) {
  try { res.json(await currentWeather(12.74642, 121.48741, "Bongabong, Oriental Mindoro")); }
  catch (error) { const unavailable = new Error("Live weather is temporarily unavailable. Please refresh again in a moment."); unavailable.status = 503; next(unavailable); }
}

export async function myLandWeather(req, res, next) {
  try {
    const farmer = await getFarmerByUserId(req.user.id);
    const lands = farmer ? await listLandsByFarmer(farmer.id) : [];
    const land = req.query.landId ? lands.find(item => String(item.id) === String(req.query.landId)) : lands[0];
    if (!land) return res.status(422).json({ message: "Add a registered land with accurate coordinates to view local weather." });
    if (!Number.isFinite(Number(land.latitude)) || !Number.isFinite(Number(land.longitude))) return res.status(422).json({ message: "Your selected land needs valid latitude and longitude coordinates for local weather." });
    const place = [land.name || "Registered farm", land.barangay, "Bongabong, Oriental Mindoro"].filter(Boolean).join(" • ");
    res.json(await currentWeather(land.latitude, land.longitude, place));
  } catch (error) { const unavailable = new Error("Live weather is temporarily unavailable. Please refresh again in a moment."); unavailable.status = 503; next(unavailable); }
}
