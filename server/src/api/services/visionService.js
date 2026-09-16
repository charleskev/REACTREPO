// AI results are advisory: a farmer and MAO Staff remain the authoritative source of report labels.
const damageTypes = ["Flood", "Drought", "Typhoon / strong wind", "Pest infestation", "Plant disease", "Nutrient deficiency", "Animal damage", "Fire", "Landslide", "Other", "Unknown"];
const categories = new Set(["fruit", "vegetable", "field crop", "tree crop", "ornamental plant", "livestock", "animal", "farm equipment", "tool", "person", "vehicle", "building", "general object", "non-agricultural", "unknown"]);
const cropMatchStatuses = new Set(["match", "possible match", "not listed", "not applicable", "unknown"]);
const urgencyLevels = new Set(["routine", "soon", "urgent", "unknown"]);
const healthStatuses = new Set(["healthy appearance", "possible damage", "mixed / uncertain", "not assessable"]);
const minimumCropConfidence = 0.7;

function text(value, fallback = "Unknown", limit = 120) {
  const result = String(value || "").trim().slice(0, limit);
  return result || fallback;
}

function cleanItem(item) {
  const label = text(typeof item === "string" ? item : item?.label, "Unknown", 80);
  const category = text(typeof item === "string" ? "general object" : item?.category, "general object", 40).toLowerCase();
  return { label, category: categories.has(category) ? category : "general object", confidence: Math.max(0, Math.min(1, Number(item?.confidence) || 0)) };
}

function parseResponse(responseText) {
  try {
    const value = JSON.parse(responseText.replace(/^```json\s*|\s*```$/g, "").trim());
    const detectedItems = Array.isArray(value.detectedItems) ? value.detectedItems.slice(0, 12).map(cleanItem).filter(item => item.label !== "Unknown") : [];
    const visibleObjects = detectedItems.length ? detectedItems.map(item => item.label) : (Array.isArray(value.visibleObjects) ? value.visibleObjects.slice(0, 12).map(item => text(item, "Unknown", 80)).filter(item => item !== "Unknown") : []);
    const confidence = Math.max(0, Math.min(1, Number(value.confidence) || 0));
    const category = categories.has(String(value.category || "").toLowerCase()) ? String(value.category).toLowerCase() : "unknown";
    const cropCategory = ["fruit", "vegetable", "field crop", "tree crop"].includes(category);
    const cropIsClear = !cropCategory || confidence >= minimumCropConfidence;
    return {
      cropOrPlant: cropIsClear ? text(value.cropOrPlant) : "Unknown",
      category: cropIsClear ? category : "unknown",
      imageSummary: text(value.imageSummary, "No clear subject identified.", 240),
      sceneType: text(value.sceneType, "unknown", 80),
      detectedItems: detectedItems.length ? detectedItems : visibleObjects.map(label => ({ label, category: "general object", confidence: 0 })),
      visibleObjects,
      possibleDamageType: cropIsClear && damageTypes.includes(value.possibleDamageType) ? value.possibleDamageType : "Unknown",
      visibleSymptoms: Array.isArray(value.visibleSymptoms) ? value.visibleSymptoms.slice(0, 8).map(item => text(item, "Unknown", 120)).filter(item => item !== "Unknown") : [],
      reportRecommendation: text(value.reportRecommendation, "Confirm the crop and damage type before submitting.", 180),
      registeredCropMatch: cropMatchStatuses.has(String(value.registeredCropMatch || "").toLowerCase()) ? String(value.registeredCropMatch).toLowerCase() : "unknown",
      reportSuggestion: text(value.reportSuggestion, "Use a clear close-up photo and confirm the crop and damage labels before submitting.", 220),
      urgency: urgencyLevels.has(String(value.urgency || "").toLowerCase()) ? String(value.urgency).toLowerCase() : "unknown",
      healthStatus: healthStatuses.has(String(value.healthStatus || "").toLowerCase()) ? String(value.healthStatus).toLowerCase() : "not assessable",
      plantPartVisible: text(value.plantPartVisible, "unknown", 60),
      growthStage: text(value.growthStage, "unknown", 80),
      evidenceToCapture: Array.isArray(value.evidenceToCapture) ? value.evidenceToCapture.slice(0, 4).map(item => text(item, "", 100)).filter(Boolean) : [],
      confidence,
      qualityCheck: cropCategory && !cropIsClear ? "needs_clearer_photo" : "sufficient_for_advisory",
      needsVerification: true,
    };
  } catch { return null; }
}

export async function identifyCropDamage(imageBuffer, mimeType, landContext = {}) {
  if (!process.env.GEMINI_API_KEY) return null;
  const model = process.env.GEMINI_VISION_MODEL || "gemini-2.5-flash";
  const cropTypes = Array.isArray(landContext.cropTypes) ? landContext.cropTypes.map(item => text(item, "", 60)).filter(Boolean).slice(0, 20) : [];
  const landReference = cropTypes.length ? cropTypes.join(", ") : "No registered crop type was provided";
  const reportedCrop = text(landContext.reportedCrop, "Not selected", 60);
  const reportedDamageType = text(landContext.reportedDamageType, "Not selected", 60);
  const farmerNotes = text(landContext.farmerNotes, "No notes provided", 800);
  const prompt = `You are analyzing one captured image for a Philippine Municipal Agriculture Office (MAO) crop-damage report. Identify only what is visibly supported. The photo may contain fruit, vegetables, field crops, tree crops, plants, livestock, farm equipment, tools, people, vehicles, buildings, or ordinary household objects.

The farmer selected land "${text(landContext.landName, "Unnamed land", 80)}". Its registered crop types are: ${landReference}. The farmer currently selected this report crop: ${reportedCrop}; selected damage type: ${reportedDamageType}; farmer notes: ${farmerNotes}. These are context hints only. Never force a match from the registered list, form labels, or notes when the image does not visibly support it. If blurry, distant, obstructed, or not a crop image, return Unknown and ask for better evidence. In reportSuggestion, clearly state whether the selected crop/damage label agrees with the visible evidence, then say what the farmer should add or correct before submitting.

For Philippine agriculture, carefully distinguish when visible: rice/palay, corn/mais, coconut/niyog, banana/saging, mango/mangga, pineapple, papaya, calamansi/citrus, avocado, watermelon, melon, dragon fruit, jackfruit/langka, guava/bayabas, rambutan, lanzones, durian, guyabano, santol, marang, pomelo/suha, coffee, cacao, sugarcane, cassava/kamoteng kahoy, sweet potato/kamote, taro/gabi, peanut, mung bean/monggo, eggplant/talong, tomato/kamatis, okra, squash/kalabasa, bitter gourd/ampalaya, string beans/sitaw, cucumber/pipino, chili/sili, bell pepper, pechay, cabbage, lettuce, mustard greens/mustasa, kangkong, malunggay, onion/sibuyas, garlic/bawang, ginger/luya, radish/labanos, potato, and other clearly visible produce. Distinguish a whole plant in the field from harvested fruit or vegetable. Do not guess a plant species, disease, damage, ripeness, or maturity stage from a blurry, distant, covered, or ambiguous photo. If the image is a tool, person, vehicle, building, or non-farm object, say that clearly instead of inventing a crop.

Return JSON only with this exact schema:
{"cropOrPlant":"specific name or Unknown","category":"fruit|vegetable|field crop|tree crop|ornamental plant|livestock|animal|farm equipment|tool|person|vehicle|building|general object|non-agricultural|unknown","imageSummary":"short factual description","sceneType":"farm field|garden|orchard|market|indoor|roadside|unknown","detectedItems":[{"label":"object name","category":"one allowed category","confidence":0 to 1}],"possibleDamageType":"one of: Flood, Drought, Typhoon / strong wind, Pest infestation, Plant disease, Nutrient deficiency, Animal damage, Fire, Landslide, Other, Unknown","visibleSymptoms":["only visible symptom"],"healthStatus":"healthy appearance|possible damage|mixed / uncertain|not assessable","plantPartVisible":"leaf|fruit|vegetable|flower|stem|root|whole plant|tree canopy|unknown","growthStage":"seedling|vegetative|flowering|fruiting|harvested produce|mature tree|unknown","registeredCropMatch":"match|possible match|not listed|not applicable|unknown","reportSuggestion":"specific report-label and next-evidence suggestion","urgency":"routine|soon|urgent|unknown","evidenceToCapture":["up to four useful follow-up photos or observations"],"reportRecommendation":"short safe action for the farmer","confidence":0 to 1}.

List up to 12 prominent detectedItems. Confidence must reflect visual certainty, not a guess. For a fruit, vegetable, field crop, or tree crop, use Unknown and confidence below 0.70 if the species is not clearly visible. This is advisory only and requires MAO verification.`;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: imageBuffer.toString("base64") } }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.05 },
    }),
  });
  if (!response.ok) throw new Error("Agricultural image analysis is temporarily unavailable.");
  const data = await response.json();
  const responseText = data.candidates?.[0]?.content?.parts?.map(part => part.text || "").join("") || "";
  return parseResponse(responseText);
}
