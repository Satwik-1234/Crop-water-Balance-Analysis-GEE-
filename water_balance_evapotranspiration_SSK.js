// ====================================================================
// PROFESSIONAL CROP WATER BALANCE & EVAPOTRANSPIRATION ANALYSIS
// Districts: Satara, Sangli, Kolhapur (Maharashtra, India)
// Agricultural Focus: Sugarcane, Cotton, Soybean, Jowar, Grapes
// Period: 2024 (Kharif + Rabi seasons)
// ====================================================================
// Developed with agronomic and water resources engineering principles
// Following FAO-56 methodology for ET calculation
// ====================================================================

// ==================== 1. STUDY AREA & AGRO-CLIMATIC CONTEXT ====================

/*
REGIONAL CHARACTERISTICS:
- Satara: Western Maharashtra Plateau, Semi-arid, 600-750mm rainfall
- Sangli: Krishna basin, Semi-arid to arid, 500-600mm rainfall
- Kolhapur: Southern Maharashtra, Sub-humid, 1000-3000mm rainfall (Western Ghats influence)

MAJOR CROPS:
- Kharif (June-Nov): Sugarcane, Cotton, Soybean, Jowar, Maize
- Rabi (Nov-Mar): Wheat, Gram, Onion, Vegetables
- Perennial: Grapes (viticulture in Sangli), Sugarcane (12-month crop)

IRRIGATION SOURCES:
- Krishna River & tributaries (Panchganga, Warna, Yerala)
- Reservoirs: Krishna Sagar, Radhanagari, Chandoli
- Groundwater: Declining water tables (critical issue)

WATER MANAGEMENT CHALLENGES:
- Sugarcane (high water demand) vs. water scarcity
- Monsoon dependency (90% rainfall Jun-Sep)
- Groundwater overexploitation
- Climate variability
*/

// Define study area using FAO GAUL
var gaul = ee.FeatureCollection("FAO/GAUL/2015/level2");

var districts = ['Satara', 'Sangli', 'Kolhapur'];

var studyArea = gaul.filter(ee.Filter.and(
  ee.Filter.eq('ADM1_NAME', 'Maharashtra'),
  ee.Filter.inList('ADM2_NAME', districts)
));

var roi = studyArea.geometry();

Map.centerObject(roi, 9);
Map.addLayer(roi, {color: 'yellow'}, 'Study Area - SSK Districts', true);

print('Study Districts:', studyArea.aggregate_array('ADM2_NAME').distinct());
print('Total Area:', roi.area().divide(1e6), 'sq km');

// ==================== 2. TEMPORAL FRAMEWORK ====================

// Analysis period - Full agricultural year 2024
var startDate = '2024-01-01';
var endDate = '2024-12-31';

// Kharif season (Monsoon crops)
var kharifStart = '2024-06-01';
var kharifEnd = '2024-11-30';

// Rabi season (Winter crops)
var rabiStart = '2024-11-01';
var rabiEnd = '2025-03-31';

// Monthly analysis for water balance
var months = ee.List.sequence(1, 12);

// ==================== 3. METEOROLOGICAL DATA ====================

// --- 3.1 PRECIPITATION (GPM IMERG - 0.1° resolution, ~11km) ---
var precipitation = ee.ImageCollection('NASA/GPM_L3/IMERG_V06')
  .filterBounds(roi)
  .filterDate(startDate, endDate)
  .select('precipitationCal');

// Daily, monthly, seasonal accumulations
var dailyPrecip = precipitation;

var monthlyPrecip = months.map(function(m) {
  var month = ee.Number(m);
  var monthFilter = precipitation.filter(ee.Filter.calendarRange(month, month, 'month'));
  return monthFilter.sum()
    .set('month', month)
    .set('system:time_start', ee.Date.fromYMD(2024, month, 1).millis());
});
monthlyPrecip = ee.ImageCollection.fromImages(monthlyPrecip);

var annualPrecip = precipitation.sum().clip(roi).rename('annual_precip');
var kharifPrecip = precipitation.filterDate(kharifStart, kharifEnd).sum().clip(roi).rename('kharif_precip');
var rabiPrecip = precipitation.filterDate(rabiStart, rabiEnd).sum().clip(roi).rename('rabi_precip');

print('Annual Precipitation (mean):', 
  annualPrecip.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: roi,
    scale: 5000,
    maxPixels: 1e9
  }));

// --- 3.2 TEMPERATURE (MODIS LST - 1km resolution) ---
var modisLST = ee.ImageCollection('MODIS/061/MOD11A1')
  .filterBounds(roi)
  .filterDate(startDate, endDate)
  .select(['LST_Day_1km', 'LST_Night_1km']);

// Convert from Kelvin to Celsius and calculate mean temperature
var temperature = modisLST.map(function(img) {
  var day = img.select('LST_Day_1km').multiply(0.02).subtract(273.15);
  var night = img.select('LST_Night_1km').multiply(0.02).subtract(273.15);
  var tmean = day.add(night).divide(2).rename('tmean');
  var tmax = day.rename('tmax');
  var tmin = night.rename('tmin');
  return tmean.addBands(tmax).addBands(tmin)
    .copyProperties(img, ['system:time_start']);
});

var annualTmean = temperature.select('tmean').mean().clip(roi).rename('annual_tmean');
var annualTmax = temperature.select('tmax').mean().clip(roi).rename('annual_tmax');
var annualTmin = temperature.select('tmin').mean().clip(roi).rename('annual_tmin');

// Monthly temperature
var monthlyTemp = months.map(function(m) {
  var month = ee.Number(m);
  var monthFilter = temperature.filter(ee.Filter.calendarRange(month, month, 'month'));
  return monthFilter.select('tmean').mean()
    .set('month', month)
    .set('system:time_start', ee.Date.fromYMD(2024, month, 1).millis());
});
monthlyTemp = ee.ImageCollection.fromImages(monthlyTemp);

// --- 3.3 SOLAR RADIATION (MODIS - for ET calculation) ---
// Using albedo and LST as proxies for incoming solar radiation
var albedo = ee.ImageCollection('MODIS/061/MCD43A3')
  .filterBounds(roi)
  .filterDate(startDate, endDate)
  .select('Albedo_WSA_shortwave')
  .mean()
  .multiply(0.001)
  .clip(roi)
  .rename('albedo');

// Extraterrestrial radiation calculation (latitude-based)
var latImg = ee.Image.pixelLonLat().select('latitude');
var latitude = latImg.clip(roi);

// Simplified solar radiation estimation (MJ/m²/day)
// Based on latitude and day of year
var doy = ee.Number(180); // Mid-year approximation
var solarDeclination = ee.Number(23.45).multiply(
  ee.Number(2).multiply(ee.Number(Math.PI)).divide(365)
    .multiply(doy.subtract(81)).sin()
).multiply(Math.PI / 180);

var solarRadiation = latitude.multiply(Math.PI / 180)
  .cos().multiply(solarDeclination.cos())
  .multiply(24)
  .multiply(15.392) // Conversion factor
  .rename('solar_radiation');

// --- 3.4 WIND SPEED (ERA5-Land reanalysis - 9km resolution) ---
var windSpeed = ee.ImageCollection('ECMWF/ERA5_LAND/DAILY_AGGR')
  .filterBounds(roi)
  .filterDate(startDate, endDate)
  .select('u_component_of_wind_10m', 'v_component_of_wind_10m');

// Calculate wind magnitude
var wind = windSpeed.map(function(img) {
  var u = img.select('u_component_of_wind_10m');
  var v = img.select('v_component_of_wind_10m');
  var magnitude = u.pow(2).add(v.pow(2)).sqrt().rename('wind_speed');
  return magnitude.copyProperties(img, ['system:time_start']);
});

var annualWind = wind.mean().clip(roi).rename('annual_wind');

// --- 3.5 RELATIVE HUMIDITY (ERA5-Land) ---
var era5 = ee.ImageCollection('ECMWF/ERA5_LAND/DAILY_AGGR')
  .filterBounds(roi)
  .filterDate(startDate, endDate);

// Calculate relative humidity from dewpoint temperature
var humidity = era5.map(function(img) {
  var dewpoint = img.select('dewpoint_temperature_2m').subtract(273.15);
  var temp = img.select('temperature_2m').subtract(273.15);
  
  // Saturation vapor pressure (kPa)
  var es = temp.multiply(17.27).divide(temp.add(237.3)).exp().multiply(0.6108);
  var ea = dewpoint.multiply(17.27).divide(dewpoint.add(237.3)).exp().multiply(0.6108);
  
  var rh = ea.divide(es).multiply(100).rename('relative_humidity');
  var vpd = es.subtract(ea).rename('vapor_pressure_deficit'); // kPa
  
  return rh.addBands(vpd).copyProperties(img, ['system:time_start']);
});

var annualRH = humidity.select('relative_humidity').mean().clip(roi).rename('annual_rh');
var annualVPD = humidity.select('vapor_pressure_deficit').mean().clip(roi).rename('annual_vpd');

// ==================== 4. LAND COVER & CROP CLASSIFICATION ====================

// --- 4.1 SENTINEL-2 BASED CROP MAPPING ---
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(roi)
  .filterDate(startDate, endDate)
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20));

// Cloud masking
function maskS2clouds(image) {
  var qa = image.select('QA60');
  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
      .and(qa.bitwiseAnd(cirrusBitMask).eq(0));
  return image.updateMask(mask).divide(10000);
}

var s2_clean = s2.map(maskS2clouds);

// Kharif season composite (for crop identification)
var kharifComposite = s2_clean.filterDate(kharifStart, kharifEnd).median().clip(roi);

// Rabi season composite
var rabiComposite = s2_clean.filterDate(rabiStart, rabiEnd).median().clip(roi);

// Annual composite
var s2_composite = s2_clean.median().clip(roi);

// --- 4.2 VEGETATION INDICES (for crop vigor and ET estimation) ---
var ndvi = s2_composite.normalizedDifference(['B8', 'B4']).rename('NDVI');
var evi = s2_composite.expression(
  '2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))', {
    'NIR': s2_composite.select('B8'),
    'RED': s2_composite.select('B4'),
    'BLUE': s2_composite.select('B2')
}).rename('EVI');

var savi = s2_composite.expression(
  '((NIR - RED) / (NIR + RED + 0.5)) * 1.5', {
    'NIR': s2_composite.select('B8'),
    'RED': s2_composite.select('B4')
}).rename('SAVI');

var ndwi = s2_composite.normalizedDifference(['B3', 'B8']).rename('NDWI');

// Leaf Area Index (LAI) estimation from NDVI
// Empirical relationship: LAI = 3.618 * EVI - 0.118
var lai = evi.multiply(3.618).subtract(0.118).clamp(0, 7).rename('LAI');

// --- 4.3 ESA WORLDCOVER (for land use context) ---
var landcover = ee.ImageCollection('ESA/WorldCover/v200')
  .first()
  .clip(roi)
  .select('Map')
  .rename('landcover');

// Cropland mask (ESA class 40 = cropland)
var croplandMask = landcover.eq(40);

// --- 4.4 CROP TYPE CLASSIFICATION (Simplified) ---
// Based on NDVI temporal profile and phenology

// Calculate NDVI time series statistics
var ndviTS = s2_clean.map(function(img) {
  return img.normalizedDifference(['B8', 'B4']).rename('NDVI')
    .copyProperties(img, ['system:time_start']);
});

var ndviKharif = ndviTS.filterDate(kharifStart, kharifEnd).mean().clip(roi);
var ndviRabi = ndviTS.filterDate(rabiStart, rabiEnd).mean().clip(roi);
var ndviStd = ndviTS.reduce(ee.Reducer.stdDev()).clip(roi).rename('NDVI_std');
var ndviMax = ndviTS.max().clip(roi).rename('NDVI_max');

// Simple crop classification based on phenology
// Sugarcane: High NDVI year-round, low variability
// Cotton: Moderate-high NDVI in Kharif
// Soybean: Moderate NDVI in Kharif, higher variability
// Wheat: High NDVI in Rabi

var sugarcane = ndviMax.gt(0.7).and(ndviStd.lt(0.1)).and(croplandMask).rename('sugarcane');
var cotton = ndviKharif.gt(0.6).and(ndviKharif.lt(0.8)).and(ndviStd.gt(0.15)).and(croplandMask).rename('cotton');
var soybean = ndviKharif.gt(0.5).and(ndviKharif.lt(0.7)).and(ndviStd.gt(0.2)).and(croplandMask).rename('soybean');
var wheat = ndviRabi.gt(0.6).and(croplandMask).rename('wheat');

// Create crop type map (simplified)
var cropType = ee.Image(0)
  .where(sugarcane.eq(1), 1)  // Sugarcane
  .where(cotton.eq(1), 2)     // Cotton
  .where(soybean.eq(1), 3)    // Soybean
  .where(wheat.eq(1), 4)      // Wheat
  .where(croplandMask.eq(1).and(ndvi.gt(0.3)), 5)  // Other crops
  .updateMask(croplandMask)
  .rename('crop_type');

// ==================== 5. SOIL PROPERTIES ====================

// --- 5.1 SOIL MOISTURE (SMAP L4 - 9km resolution) ---
var smap = ee.ImageCollection('NASA/SMAP/SPL4SMGP/007')
  .filterBounds(roi)
  .filterDate(startDate, endDate);

var soilMoistureSurface = smap.select('sm_surface').mean().clip(roi).rename('sm_surface');
var soilMoistureRootZone = smap.select('sm_rootzone').mean().clip(roi).rename('sm_rootzone');

// Monthly soil moisture
var monthlySM = months.map(function(m) {
  var month = ee.Number(m);
  var monthFilter = smap.filter(ee.Filter.calendarRange(month, month, 'month'));
  return monthFilter.select('sm_rootzone').mean()
    .set('month', month)
    .set('system:time_start', ee.Date.fromYMD(2024, month, 1).millis());
});
monthlySM = ee.ImageCollection.fromImages(monthlySM);

// --- 5.2 SOIL TEXTURE (OpenLandMap - 250m resolution) ---
var sandContent = ee.Image('OpenLandMap/SOL/SOL_SAND-WFRACTION_USDA-3A1A1A_M/v02')
  .select('b0').multiply(0.01).clip(roi).rename('sand_fraction'); // 0-15cm depth

var clayContent = ee.Image('OpenLandMap/SOL/SOL_CLAY-WFRACTION_USDA-3A1A1A_M/v02')
  .select('b0').multiply(0.01).clip(roi).rename('clay_fraction');

var siltContent = ee.Image(1).subtract(sandContent).subtract(clayContent).rename('silt_fraction');

// --- 5.3 FIELD CAPACITY & WILTING POINT (from texture) ---
// Empirical relationships (Saxton & Rawls, 2006)

var fieldCapacity = sandContent.multiply(-0.251)
  .add(clayContent.multiply(0.195))
  .add(0.505)
  .rename('field_capacity');

var wiltingPoint = sandContent.multiply(-0.024)
  .add(clayContent.multiply(0.487))
  .add(0.006)
  .rename('wilting_point');

var availableWaterCapacity = fieldCapacity.subtract(wiltingPoint)
  .multiply(1000) // Convert to mm per meter of soil
  .rename('AWC');

// Assume 1m root zone depth for most crops
var rootZoneDepth = ee.Image(1000).rename('root_depth'); // mm

var totalAWC = availableWaterCapacity.multiply(rootZoneDepth.divide(1000)).rename('total_AWC');

// ==================== 6. REFERENCE EVAPOTRANSPIRATION (ET₀) ====================
// Using FAO-56 Penman-Monteith equation (simplified)

// --- 6.1 CALCULATE ET₀ COMPONENTS ---

// Slope of saturation vapor pressure curve (kPa/°C)
var delta = annualTmean.multiply(17.27).divide(annualTmean.add(237.3))
  .exp().multiply(0.6108).multiply(4098)
  .divide(annualTmean.add(237.3).pow(2))
  .rename('delta');

// Psychrometric constant (kPa/°C)
// γ = 0.665 × 10⁻³ × P
// P = atmospheric pressure (kPa) = 101.3 × ((293-0.0065×z)/293)^5.26
var elevation = ee.Image('USGS/SRTMGL1_003').select('elevation').clip(roi);
var pressure = ee.Image(101.3).multiply(
  ee.Image(293).subtract(elevation.multiply(0.0065))
    .divide(293).pow(5.26)
).rename('pressure');

var gamma = pressure.multiply(0.000665).rename('gamma');

// Net radiation (MJ/m²/day) - simplified
// Rn ≈ (1 - albedo) × Rs - Rnl
// where Rs = incoming solar radiation, Rnl = net longwave radiation

var netRadiation = solarRadiation.multiply(ee.Image(1).subtract(albedo))
  .subtract(5) // Approximate net longwave radiation
  .rename('net_radiation');

// Soil heat flux (G) - negligible for daily calculations
var soilHeatFlux = ee.Image(0).rename('soil_heat_flux');

// --- 6.2 FAO-56 PENMAN-MONTEITH ET₀ (mm/day) ---
// ET₀ = (0.408 × Δ × (Rn - G) + γ × (900/(T+273)) × u₂ × VPD) / (Δ + γ × (1 + 0.34 × u₂))

var numerator1 = delta.multiply(netRadiation.subtract(soilHeatFlux)).multiply(0.408);

var numerator2 = gamma
  .multiply(annualTmean.add(273).divide(900))
  .multiply(annualWind)
  .multiply(annualVPD);

var numerator = numerator1.add(numerator2);

var denominator = delta.add(gamma.multiply(annualWind.multiply(0.34).add(1)));

var et0Daily = numerator.divide(denominator).clamp(0, 15).rename('ET0_daily');

// Annual ET₀
var et0Annual = et0Daily.multiply(365).rename('ET0_annual');

print('Mean ET0 (mm/day):', 
  et0Daily.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: roi,
    scale: 5000,
    maxPixels: 1e9
  }));

// Monthly ET₀ (using monthly temperature)
var monthlyET0 = months.map(function(m) {
  var month = ee.Number(m);
  
  // Get monthly averages
  var monthTempImg = monthlyTemp.filter(ee.Filter.eq('month', month)).first();
  var monthPrecipImg = monthlyPrecip.filter(ee.Filter.eq('month', month)).first();
  
  // Simplified monthly ET₀ calculation
  var monthET0 = et0Daily.multiply(30); // Approximate for display
  
  return monthET0
    .set('month', month)
    .set('system:time_start', ee.Date.fromYMD(2024, month, 1).millis());
});
monthlyET0 = ee.ImageCollection.fromImages(monthlyET0);

// ==================== 7. CROP EVAPOTRANSPIRATION (ETc) ====================
// ETc = Kc × ET₀

// --- 7.1 CROP COEFFICIENTS (Kc) - FAO-56 values ---
/*
CROP COEFFICIENTS (by growth stage):
Sugarcane: Kc_ini=0.4, Kc_mid=1.25, Kc_end=0.75 (12-month)
Cotton: Kc_ini=0.35, Kc_mid=1.15, Kc_end=0.70 (140-175 days)
Soybean: Kc_ini=0.40, Kc_mid=1.15, Kc_end=0.50 (135-150 days)
Wheat: Kc_ini=0.30, Kc_mid=1.15, Kc_end=0.40 (120-150 days)
Jowar: Kc_ini=0.30, Kc_mid=1.10, Kc_end=0.60 (120-130 days)

For simplicity, using mid-season Kc (peak water demand)
*/

var kcSugarcane = ee.Image(1.25);
var kcCotton = ee.Image(1.15);
var kcSoybean = ee.Image(1.15);
var kcWheat = ee.Image(1.15);
var kcOther = ee.Image(0.90);

// Create Kc map based on crop type
var kcMap = ee.Image(0.70) // Base Kc for non-crop areas
  .where(cropType.eq(1), kcSugarcane)
  .where(cropType.eq(2), kcCotton)
  .where(cropType.eq(3), kcSoybean)
  .where(cropType.eq(4), kcWheat)
  .where(cropType.eq(5), kcOther)
  .rename('Kc');

// Alternative: Estimate Kc from vegetation indices (NDVI-based)
// Kc = 1.2 × NDVI + 0.1 (empirical relationship)
var kcNDVI = ndvi.multiply(1.2).add(0.1).clamp(0.1, 1.3).rename('Kc_NDVI');

// Use NDVI-based Kc for better spatial accuracy
var kc = kcNDVI;

// --- 7.2 CALCULATE ETc ---
var etcDaily = et0Daily.multiply(kc).rename('ETc_daily');
var etcAnnual = etcDaily.multiply(365).rename('ETc_annual');

// Seasonal ETc
var etcKharif = et0Daily.multiply(kc).multiply(180).rename('ETc_kharif'); // ~6 months
var etcRabi = et0Daily.multiply(kc).multiply(150).rename('ETc_rabi'); // ~5 months

print('Mean ETc (mm/day):', 
  etcDaily.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: roi,
    scale: 5000,
    maxPixels: 1e9
  }));

// ==================== 8. WATER BALANCE CALCULATION ====================
// Water Balance Equation: ΔS = P + I - ETc - RO - DP

// Where:
// ΔS = Change in soil moisture storage
// P = Precipitation
// I = Irrigation (assumed/estimated)
// ETc = Crop evapotranspiration
// RO = Runoff
// DP = Deep percolation

// --- 8.1 RUNOFF ESTIMATION (SCS Curve Number method) ---

// Curve Number based on soil type and land cover
// For cropland in semi-arid region: CN ≈ 70-85
var curveNumber = ee.Image(75) // Average for cultivated land
  .where(cropType.eq(1), 80)  // Sugarcane (higher irrigation)
  .where(landcover.eq(10), 50) // Forest (lower runoff)
  .rename('curve_number');

// Maximum retention (mm)
var maxRetention = ee.Image(25400).divide(curveNumber).subtract(254).rename('S_max');

// Calculate runoff for annual precipitation
// Q = (P - 0.2S)² / (P + 0.8S), where P > 0.2S
var initialAbstraction = maxRetention.multiply(0.2);

var runoff = annualPrecip.subtract(initialAbstraction)
  .pow(2)
  .divide(annualPrecip.add(maxRetention.multiply(0.8)))
  .where(annualPrecip.lte(initialAbstraction), 0)
  .rename('runoff_annual');

// --- 8.2 IRRIGATION REQUIREMENT ESTIMATION ---
// IR = ETc - Pe (effective precipitation)
// Pe = Precipitation - Runoff - Deep percolation

// Effective precipitation (assuming 75% efficiency)
var effectivePrecip = annualPrecip.subtract(runoff).multiply(0.75).rename('effective_precip');

// Net irrigation requirement
var irrigationRequirement = etcAnnual.subtract(effectivePrecip)
  .where(etcAnnual.subtract(effectivePrecip).lt(0), 0)
  .rename('irrigation_requirement');

// Gross irrigation requirement (assuming 70% irrigation efficiency)
var grossIrrigationReq = irrigationRequirement.divide(0.70).rename('gross_irrigation_req');

// --- 8.3 DEEP PERCOLATION ---
// Simplified: assume 20% of excess water (P - ETc) percolates
var waterSurplus = annualPrecip.subtract(etcAnnual).where(
  annualPrecip.subtract(etcAnnual).lt(0), 0
);

var deepPercolation = waterSurplus.multiply(0.20).rename('deep_percolation');

// --- 8.4 ACTUAL EVAPOTRANSPIRATION (ETa) ---
// ETa considers water stress
// ETa = ETc × Ks, where Ks = water stress coefficient (0-1)

// Calculate Ks from soil moisture
var smNormalized = soilMoistureRootZone.subtract(wiltingPoint)
  .divide(fieldCapacity.subtract(wiltingPoint))
  .clamp(0, 1);

var ks = smNormalized.rename('Ks');

var etaDaily = etcDaily.multiply(ks).rename('ETa_daily');
var etaAnnual = etaDaily.multiply(365).rename('ETa_annual');

// --- 8.5 WATER DEFICIT ---
var waterDeficit = etcAnnual.subtract(etaAnnual).rename('water_deficit');

// --- 8.6 WATER BALANCE COMPONENTS ---
var waterBalance = ee.Image.cat([
  annualPrecip,
  et0Annual,
  etcAnnual,
  etaAnnual,
  runoff,
  deepPercolation,
  effectivePrecip,
  irrigationRequirement,
  grossIrrigationReq,
  waterDeficit
]);

print('Water Balance Components:', waterBalance.bandNames());

// ==================== 9. WATER STRESS INDICES ====================

// --- 9.1 CROP WATER STRESS INDEX (CWSI) ---
// CWSI = (ETc - ETa) / ETc
var cwsi = etcAnnual.subtract(etaAnnual)
  .divide(etcAnnual)
  .clamp(0, 1)
  .rename('CWSI');

// --- 9.2 EVAPORATIVE STRESS INDEX (ESI) ---
// ESI = ETa / ETc
var esi = etaAnnual.divide(etcAnnual).clamp(0, 1.2).rename('ESI');

// --- 9.3 WATER PRODUCTIVITY (WP) ---
// WP = Biomass production / Water consumption
// Using NDVI as proxy for biomass
var waterProductivity = ndvi.divide(etaAnnual.divide(1000)).rename('water_productivity');

// ==================== 10. CROP-SPECIFIC WATER BUDGETS ====================

// Calculate water budgets for each major crop

function calculateCropWaterBudget(cropMask, cropName, kc) {
  var crop_et0 = et0Annual.updateMask(cropMask);
  var crop_etc = crop_et0.multiply(kc);
  var crop_precip = annualPrecip.updateMask(cropMask);
  var crop_runoff = runoff.updateMask(cropMask);
  var crop_eff_precip = crop_precip.subtract(crop_runoff).multiply(0.75);
  var crop_irr_req = crop_etc.subtract(crop_eff_precip).max(0);
  
  var stats = ee.Dictionary({
    crop: cropName,
    area_ha: cropMask.multiply(ee.Image.pixelArea()).divide(10000).reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: roi,
      scale: 100,
      maxPixels: 1e9
    }).values().get(0),
    et0_mm: crop_et0.reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: roi,
      scale: 1000,
      maxPixels: 1e9
    }).values().get(0),
    etc_mm: crop_etc.reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: roi,
      scale: 1000,
      maxPixels: 1e9
    }).values().get(0),
    precip_mm: crop_precip.reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: roi,
      scale: 1000,
      maxPixels: 1e9
    }).values().get(0),
    irrigation_mm: crop_irr_req.reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: roi,
      scale: 1000,
      maxPixels: 1e9
    }).values().get(0)
  });
  
  return ee.Feature(null, stats);
}

var sugarcaneBudget = calculateCropWaterBudget(sugarcane.eq(1), 'Sugarcane', kcSugarcane);
var cottonBudget = calculateCropWaterBudget(cotton.eq(1), 'Cotton', kcCotton);
var soybeanBudget = calculateCropWaterBudget(soybean.eq(1), 'Soybean', kcSoybean);
var wheatBudget = calculateCropWaterBudget(wheat.eq(1), 'Wheat', kcWheat);

var cropWaterBudgets = ee.FeatureCollection([
  sugarcaneBudget, cottonBudget, soybeanBudget, wheatBudget
]);

print('=== CROP WATER BUDGETS ===');
print(cropWaterBudgets);

// ==================== 11. DISTRICT-LEVEL STATISTICS ====================

var districtStats = districts.map(function(district) {
  var districtGeom = gaul.filter(ee.Filter.eq('ADM2_NAME', district)).geometry();
  
  var stats = waterBalance.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: districtGeom,
    scale: 1000,
    maxPixels: 1e9
  });
  
  return ee.Feature(null, stats.set('district', district));
});

districtStats = ee.FeatureCollection(districtStats);

print('=== DISTRICT WATER BALANCE STATISTICS ===');
print(districtStats);

// ==================== 12. VISUALIZATION ====================

// Color palettes
var precipPalette = ['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#08519c', '#08306b'];
var etPalette = ['#ffffcc', '#ffeda0', '#fed976', '#feb24c', '#fd8d3c', '#fc4e2a', '#e31a1c', '#bd0026', '#800026'];
var ndviPalette = ['#d73027', '#f46d43', '#fdae61', '#fee08b', '#d9ef8b', '#a6d96a', '#66bd63', '#1a9850', '#006837'];
var stressPalette = ['#006837', '#1a9850', '#66bd63', '#a6d96a', '#d9ef8b', '#fee08b', '#fdae61', '#f46d43', '#d73027'];
var cropPalette = ['#ffffff', '#e41a1c', '#377eb8', '#4daf4a', '#ff7f00', '#ffff33'];

// Base layers
Map.addLayer(s2_composite, {bands: ['B4', 'B3', 'B2'], min: 0, max: 0.3}, 'Sentinel-2 RGB', false);
Map.addLayer(ndvi, {min: 0, max: 1, palette: ndviPalette}, 'NDVI', false);
Map.addLayer(lai, {min: 0, max: 6, palette: ndviPalette}, 'Leaf Area Index', false);

// Crop classification
Map.addLayer(cropType.updateMask(croplandMask), {
  min: 0, max: 5, 
  palette: cropPalette
}, 'Crop Types', true);

// Meteorological layers
Map.addLayer(annualPrecip, {min: 400, max: 2000, palette: precipPalette}, 'Annual Precipitation (mm)', true);
Map.addLayer(annualTmean, {min: 15, max: 35, palette: ['blue', 'white', 'red']}, 'Mean Temperature (°C)', false);

// ET layers
Map.addLayer(et0Annual, {min: 800, max: 1800, palette: etPalette}, 'Reference ET₀ (mm/year)', false);
Map.addLayer(etcAnnual, {min: 600, max: 2000, palette: etPalette}, 'Crop ETc (mm/year)', true);
Map.addLayer(etaAnnual, {min: 400, max: 1800, palette: etPalette}, 'Actual ETa (mm/year)', true);

// Water balance
Map.addLayer(runoff, {min: 0, max: 500, palette: precipPalette}, 'Annual Runoff (mm)', false);
Map.addLayer(effectivePrecip, {min: 200, max: 1500, palette: precipPalette}, 'Effective Precipitation (mm)', false);
Map.addLayer(irrigationRequirement, {min: 0, max: 1500, palette: etPalette}, 'Irrigation Requirement (mm)', true);
Map.addLayer(grossIrrigationReq, {min: 0, max: 2000, palette: etPalette}, 'Gross Irrigation Req (mm)', false);

// Water stress
Map.addLayer(cwsi, {min: 0, max: 1, palette: stressPalette}, 'Crop Water Stress Index', true);
Map.addLayer(esi, {min: 0, max: 1, palette: stressPalette.reverse()}, 'Evaporative Stress Index', false);
Map.addLayer(waterDeficit, {min: 0, max: 800, palette: etPalette}, 'Water Deficit (mm)', false);

// Soil properties
Map.addLayer(soilMoistureRootZone, {min: 0.1, max: 0.5, palette: precipPalette}, 'Soil Moisture (Rootzone)', false);
Map.addLayer(availableWaterCapacity, {min: 50, max: 200, palette: precipPalette}, 'Available Water Capacity (mm/m)', false);

// Add legend for crop types
var cropLegend = ui.Panel({
  style: {position: 'bottom-right', padding: '8px 15px'}
});

var cropLegendTitle = ui.Label({
  value: 'Crop Types',
  style: {fontWeight: 'bold', fontSize: '16px', margin: '0 0 4px 0'}
});
cropLegend.add(cropLegendTitle);

var crops = ['Background', 'Sugarcane', 'Cotton', 'Soybean', 'Wheat', 'Other Crops'];
crops.forEach(function(crop, i) {
  var colorBox = ui.Label({
    style: {backgroundColor: cropPalette[i], padding: '8px', margin: '0 0 4px 0'}
  });
  var description = ui.Label({value: crop, style: {margin: '0 0 4px 6px'}});
  cropLegend.add(ui.Panel([colorBox, description], ui.Panel.Layout.Flow('horizontal')));
});

Map.add(cropLegend);

// ==================== 13. CHARTS & ANALYSIS ====================

// --- 13.1 Monthly Water Balance Chart ---
var monthlyWaterBalance = months.map(function(m) {
  var month = ee.Number(m);
  
  var precip = monthlyPrecip.filter(ee.Filter.eq('month', month)).first();
  var et0 = monthlyET0.filter(ee.Filter.eq('month', month)).first();
  var sm = monthlySM.filter(ee.Filter.eq('month', month)).first();
  
  var precipMean = precip.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: roi,
    scale: 5000,
    maxPixels: 1e9
  }).values().get(0);
  
  var et0Mean = et0Daily.multiply(30).reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: roi,
    scale: 5000,
    maxPixels: 1e9
  }).values().get(0);
  
  var smMean = sm.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: roi,
    scale: 5000,
    maxPixels: 1e9
  }).values().get(0);
  
  return ee.Feature(null, {
    'month': month,
    'precipitation': precipMean,
    'et0': et0Mean,
    'soil_moisture': smMean
  });
});

var monthlyChart = ui.Chart.feature.byFeature(
  ee.FeatureCollection(monthlyWaterBalance), 'month', ['precipitation', 'et0']
)
  .setChartType('LineChart')
  .setOptions({
    title: 'Monthly Water Balance - Precipitation vs ET₀',
    hAxis: {
      title: 'Month',
      ticks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    },
    vAxis: {title: 'Water (mm/month)'},
    lineWidth: 2,
    colors: ['#2171b5', '#e31a1c'],
    series: {
      0: {label: 'Precipitation'},
      1: {label: 'Reference ET₀'}
    }
  });

print(monthlyChart);

// --- 13.2 District Comparison Chart ---
var districtComparisonChart = ui.Chart.feature.byFeature({
  features: districtStats,
  xProperty: 'district',
  yProperties: ['annual_precip', 'ETc_annual', 'irrigation_requirement']
})
  .setChartType('ColumnChart')
  .setOptions({
    title: 'District Water Balance Comparison',
    hAxis: {title: 'District'},
    vAxis: {title: 'Water (mm/year)'},
    colors: ['#2171b5', '#e31a1c', '#ff7f00'],
    series: {
      0: {label: 'Precipitation'},
      1: {label: 'Crop ETc'},
      2: {label: 'Irrigation Requirement'}
    }
  });

print(districtComparisonChart);

// --- 13.3 ETc vs Precipitation Scatter ---
var scatterSample = waterBalance.select(['annual_precip', 'ETc_annual'])
  .sample({
    region: roi,
    scale: 1000,
    numPixels: 1000,
    seed: 42
  });

var scatterChart = ui.Chart.feature.byFeature(scatterSample, 'annual_precip', 'ETc_annual')
  .setChartType('ScatterChart')
  .setOptions({
    title: 'Precipitation vs Crop Water Requirement',
    hAxis: {title: 'Annual Precipitation (mm)'},
    vAxis: {title: 'Crop ETc (mm)'},
    pointSize: 3,
    colors: ['#377eb8'],
    trendlines: {0: {color: 'red', lineWidth: 2}}
  });

print(scatterChart);

// --- 13.4 Crop Water Budget Chart ---
var cropBudgetChart = ui.Chart.feature.byFeature({
  features: cropWaterBudgets,
  xProperty: 'crop',
  yProperties: ['etc_mm', 'precip_mm', 'irrigation_mm']
})
  .setChartType('ColumnChart')
  .setOptions({
    title: 'Crop-Specific Water Budgets',
    hAxis: {title: 'Crop Type'},
    vAxis: {title: 'Water (mm)'},
    isStacked: false,
    colors: ['#e31a1c', '#2171b5', '#ff7f00'],
    series: {
      0: {label: 'Crop ETc'},
      1: {label: 'Precipitation'},
      2: {label: 'Irrigation Need'}
    }
  });

print(cropBudgetChart);

// --- 13.5 Water Stress Histogram ---
var stressHisto = ui.Chart.image.histogram({
  image: cwsi,
  region: roi,
  scale: 500,
  maxBuckets: 50,
  maxPixels: 1e9
})
  .setOptions({
    title: 'Crop Water Stress Index Distribution',
    hAxis: {title: 'CWSI (0=no stress, 1=severe stress)'},
    vAxis: {title: 'Frequency (pixels)'},
    colors: ['#d73027']
  });

print(stressHisto);

// ==================== 14. EXPORT RESULTS ====================

// Export water balance components
Export.image.toDrive({
  image: waterBalance.toFloat(),
  description: 'WaterBalance_SSK_2024',
  folder: 'GEE_WaterBalance',
  region: roi,
  scale: 100,
  maxPixels: 1e9,
  crs: 'EPSG:4326'
});

// Export ET maps
var etMaps = ee.Image.cat([et0Annual, etcAnnual, etaAnnual, waterDeficit]);
Export.image.toDrive({
  image: etMaps.toFloat(),
  description: 'ET_Maps_SSK_2024',
  folder: 'GEE_WaterBalance',
  region: roi,
  scale: 100,
  maxPixels: 1e9,
  crs: 'EPSG:4326'
});

// Export crop type map
Export.image.toDrive({
  image: cropType.toUint8(),
  description: 'CropType_SSK_2024',
  folder: 'GEE_WaterBalance',
  region: roi,
  scale: 30,
  maxPixels: 1e9,
  crs: 'EPSG:4326'
});

// Export irrigation requirement
Export.image.toDrive({
  image: irrigationRequirement.toFloat(),
  description: 'IrrigationRequirement_SSK_2024',
  folder: 'GEE_WaterBalance',
  region: roi,
  scale: 100,
  maxPixels: 1e9,
  crs: 'EPSG:4326'
});

// Export district statistics
Export.table.toDrive({
  collection: districtStats,
  description: 'DistrictWaterBalance_SSK_2024',
  folder: 'GEE_WaterBalance',
  fileFormat: 'CSV'
});

// Export crop water budgets
Export.table.toDrive({
  collection: cropWaterBudgets,
  description: 'CropWaterBudgets_SSK_2024',
  folder: 'GEE_WaterBalance',
  fileFormat: 'CSV'
});

// ==================== 15. SUMMARY REPORT ====================

print('');
print('╔════════════════════════════════════════════════════════════════╗');
print('║   WATER BALANCE & EVAPOTRANSPIRATION ANALYSIS - 2024          ║');
print('║   Districts: Satara, Sangli, Kolhapur                          ║');
print('╚════════════════════════════════════════════════════════════════╝');
print('');
print('METHODOLOGY:');
print('- ET₀: FAO-56 Penman-Monteith equation');
print('- ETc: Crop coefficient method (Kc × ET₀)');
print('- Water Balance: P + I - ETc - RO - DP = ΔS');
print('- Runoff: SCS Curve Number method');
print('- Irrigation: ETc - Effective Precipitation');
print('');
print('DATA SOURCES:');
print('- Precipitation: GPM IMERG (11km, daily)');
print('- Temperature: MODIS LST (1km, daily)');
print('- Vegetation: Sentinel-2 (10m, 5-day)');
print('- Soil Moisture: SMAP L4 (9km, 3-hourly)');
print('- Meteorology: ERA5-Land (9km, hourly)');
print('- Soil Properties: OpenLandMap (250m)');
print('');
print('KEY OUTPUTS:');
print('✓ Reference Evapotranspiration (ET₀)');
print('✓ Crop Evapotranspiration (ETc)');
print('✓ Actual Evapotranspiration (ETa)');
print('✓ Irrigation Requirements (gross & net)');
print('✓ Water Deficit & Stress Indices');
print('✓ Crop-specific Water Budgets');
print('✓ District-level Statistics');
print('');
print('EXPORT TASKS:');
print('→ Water Balance Components (multi-band GeoTIFF)');
print('→ ET Maps (ET₀, ETc, ETa, Deficit)');
print('→ Crop Type Classification');
print('→ Irrigation Requirement Map');
print('→ District Statistics (CSV)');
print('→ Crop Water Budgets (CSV)');
print('');
print('Check Tasks tab to run exports');
print('═══════════════════════════════════════════════════════════════');
