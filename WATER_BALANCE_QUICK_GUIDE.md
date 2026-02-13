# QUICK REFERENCE GUIDE
## Water Balance & Evapotranspiration Analysis
### Satara, Sangli, Kolhapur Districts

---

## 🚀 GETTING STARTED (5 MINUTES)

### What This Analysis Does
✅ Calculates water requirements for all major crops  
✅ Estimates irrigation needs for each district  
✅ Identifies water stress hotspots  
✅ Provides monthly water balance  
✅ Generates actionable maps and reports  

### Before You Begin
- [ ] Google Earth Engine account (get at: earthengine.google.com)
- [ ] Basic understanding of irrigation and crops
- [ ] Google Drive space (>5 GB recommended)

---

## 📊 KEY OUTPUTS YOU'LL GET

### Maps (Toggle in GEE interface)
1. **Annual Precipitation** - Rainfall distribution across region
2. **Crop Types** - Sugarcane, Cotton, Soybean, Wheat classification
3. **Crop ETc** - Water requirement by crop (mm/year)
4. **Actual ETa** - Actual water use (considering stress)
5. **Irrigation Requirement** - How much irrigation needed (mm/year)
6. **Water Stress (CWSI)** - Where crops are stressed (0-1 scale)

### Charts (In Console)
1. Monthly Water Balance - Shows surplus/deficit months
2. District Comparison - Compares 3 districts
3. ETc vs Precipitation - Relationship analysis
4. Crop Water Budgets - Water needs by crop
5. Stress Distribution - How much area is stressed

### Export Files
1. `WaterBalance_SSK_2024.tif` - All water components (10 bands)
2. `ET_Maps_SSK_2024.tif` - ET₀, ETc, ETa, Deficit (4 bands)
3. `CropType_SSK_2024.tif` - Crop classification map
4. `IrrigationRequirement_SSK_2024.tif` - Irrigation needs
5. `DistrictWaterBalance_SSK_2024.csv` - District statistics
6. `CropWaterBudgets_SSK_2024.csv` - Crop-wise budgets

---

## 📖 UNDERSTANDING THE OUTPUTS

### Water Balance Terms Explained

**Precipitation (P)**: Rainfall (mm/year)
- Satara: ~700 mm
- Sangli: ~550 mm
- Kolhapur: ~1200 mm (varies widely)

**Reference ET₀**: Evaporation from well-watered grass
- Think of it as "atmospheric demand for water"
- All districts: ~1500-1700 mm/year
- Always higher than rainfall in this region!

**Crop ETc**: Actual water need of crops
- Sugarcane: 1800-2500 mm (very high!)
- Cotton: 700-900 mm
- Soybean: 450-550 mm
- Wheat: 450-550 mm

**Actual ETa**: What crops actually get
- = ETc when water available
- < ETc when water stressed
- Gap between ETc and ETa = water deficit

**Irrigation Requirement**:
- **Net**: ETc - Effective Rainfall
- **Gross**: Net / Efficiency (0.70)
- This is what farmers need to apply!

**Water Stress Index (CWSI)**:
- 0.0 = No stress (happy crops)
- 0.3 = Mild stress (should irrigate soon)
- 0.5 = Moderate stress (yield loss starting)
- 0.7+ = Severe stress (critical!)

---

## 🎯 PRACTICAL INTERPRETATION

### For Water Resource Managers

**District Water Budget**:
```
Annual Water Need = ETc × Cropped Area
Water Available = Rainfall + Reservoir + Groundwater
Gap = Need - Available

If Gap > 0 → Water deficit (need to manage demand)
If Gap < 0 → Water surplus (monsoon runoff)
```

**Priority Actions** (based on Irrigation Requirement map):
1. **Dark Red zones** (>1500 mm): Critical - reduce sugarcane
2. **Orange zones** (1000-1500 mm): High - improve efficiency
3. **Yellow zones** (500-1000 mm): Moderate - optimize scheduling
4. **Green zones** (<500 mm): Low - rainfed possible

### For Agricultural Officers

**Crop Planning Guidance**:

Check the **Crop Water Budget chart**:
- Sugarcane irrigation need ~1500 mm → Limit to canal command areas
- Cotton irrigation need ~300 mm → Suitable for most areas
- Soybean irrigation need ~100 mm → Promote in rainfed areas
- Wheat irrigation need ~450 mm → Good for assured irrigation areas

**Cropping Pattern Recommendations**:
```
Water Scarce Blocks (Sangli east):
- 60% Soybean/Pulses (low water)
- 30% Cotton (medium water)
- 10% Sugarcane (only near canals)

Medium Water Blocks (Satara):
- 40% Cotton
- 30% Jowar/Pulses
- 20% Wheat/Gram
- 10% Sugarcane

Better Water Blocks (Kolhapur west):
- 30% Sugarcane
- 30% Vegetables/Horticulture
- 40% Other crops
```

### For Farmers

**When to Irrigate** (use CWSI map):
- CWSI < 0.3 → Don't irrigate (waste of water)
- CWSI 0.3-0.5 → Plan irrigation in 3-5 days
- CWSI 0.5-0.7 → Irrigate within 24 hours
- CWSI > 0.7 → Emergency irrigation (crop damage)

**How Much to Irrigate**:
1. Check **Irrigation Requirement** for your area
2. Divide by number of irrigations for your crop:
   - Sugarcane: 25-30 irrigations → 50-80 mm per irrigation
   - Cotton: 4-6 irrigations → 50-80 mm per irrigation
   - Wheat: 4-5 irrigations → 80-100 mm per irrigation
3. Adjust for your irrigation method:
   - Flood/Furrow: Multiply by 1.4 (only 70% efficient)
   - Sprinkler: Multiply by 1.3
   - Drip: Use as-is (90% efficient)

**Water Saving Tips**:
- Switch to drip for sugarcane → Save 40-50% water
- Mulching → Save 15-20% water
- Irrigate early morning/evening → Save 10-15% (less evaporation)
- Avoid irrigation during cloudy/cool days

---

## 📅 MONTHLY GUIDANCE (from Monthly Water Balance chart)

**January-February**:
- Water Balance: Deficit (P << ET₀)
- Crops: Wheat, Gram at peak demand
- Action: Schedule 1-2 irrigations for Rabi crops

**March-May** (Critical Period):
- Water Balance: Severe deficit
- Crops: Sugarcane, summer crops stressed
- Action: Conserve groundwater, prepare for monsoon

**June-September** (Monsoon):
- Water Balance: **Surplus** (P > ET₀)
- Crops: Kharif sowing, growth
- Action: **Harvest runoff**, recharge groundwater, minimum irrigation

**October-December**:
- Water Balance: Deficit returns
- Crops: Kharif harvest, Rabi sowing
- Action: Pre-sowing irrigation for wheat

---

## 🔍 TROUBLESHOOTING COMMON QUESTIONS

### Q1: Why is my sugarcane area showing such high irrigation requirement?

**A**: Sugarcane needs 1800-2500 mm water over 12 months. In Sangli (rainfall ~550mm), gap is 1200-1800mm! This is the core problem.

**Solutions**:
- Switch to drip (saves 40% → need drops to ~1000mm)
- Reduce sugarcane area
- Grow only in canal command
- Use water-efficient varieties

### Q2: The map shows my area as "high water stress" but I irrigate regularly. Why?

**A**: Several possibilities:
1. Irrigation efficiency low (flood irrigation ~60% efficient)
2. Deep percolation losses (sandy soils)
3. Peak ET₀ days not covered
4. Canal water not reaching during critical period

**Check**:
- Soil moisture in afternoon (if dry → not enough water)
- Crop appearance (wilting, yellowing → stressed)
- Well water levels (declining → over-extraction)

### Q3: Monthly chart shows "surplus" in monsoon but farms still need irrigation?

**A**: Surplus is REGIONAL average. Local factors:
- Rainfall temporal variability (dry spells)
- Soil type (sandy soils don't retain water)
- Crop at critical stage needs continuous moisture
- Runoff (water flows away instead of being stored)

**Action**: Farm ponds to capture monsoon surplus for dry spells

### Q4: District statistics show Kolhapur has low irrigation requirement, but farmers still struggle?

**A**: Kolhapur has HIGH spatial variability:
- Western Ghats (west): 2000-3000mm → Surplus
- Rain shadow (east): 600-800mm → Deficit

Check the **map**, not just district average!

### Q5: My crop type is not correctly classified. Can I fix it?

**A**: Classification is simplified (5 classes). To improve:
1. Use the NDVI layer to verify vegetation
2. Compare with your field knowledge
3. For analysis, manually digitize your field/taluka
4. In code, modify crop classification rules based on local crop calendar

### Q6: Export says "computation timed out"

**A**: Large area + high resolution. Solutions:
1. Reduce scale from 30m to 100m (faster, still good)
2. Process one district at a time
3. Simplify: Export only irrigation requirement (not all 10 bands)
4. Use `tileScale: 8` in export parameters

---

## 💡 ACTIONABLE INSIGHTS

### Top 5 Water Management Actions (Based on Analysis)

**1. Crop Diversification** (Highest Impact)
- Reduce sugarcane by 30% in water-scarce blocks
- Replace with: Cotton (50% less water), Soybean (70% less water)
- Impact: Save ~300 million m³ water annually

**2. Micro-Irrigation** (Technology)
- Target 50% drip coverage for sugarcane in 5 years
- Impact: 40-50% water saving = ~200 million m³ annually
- ROI: 2-3 years (subsidy available)

**3. Monsoon Water Harvesting** (Infrastructure)
- 1 farm pond (500m³) per 2 hectares
- Capture 25% of runoff shown in map
- Impact: 1-2 supplemental irrigations → 15% yield increase

**4. Groundwater Recharge** (Sustainability)
- Focus on monsoon surplus areas (check Precipitation map)
- Percolation tanks, check dams
- Impact: Arrest declining water tables

**5. Real-Time Irrigation Scheduling** (Precision)
- Use CWSI map updated weekly
- Irrigate only when CWSI > 0.3
- Impact: 20-30% water saving without yield loss

### Investment Priority Zones

**High Priority** (Sangli eastern blocks):
- Crop diversification programs
- Community water harvesting structures
- Drip irrigation subsidy
- Awareness campaigns

**Medium Priority** (Satara central):
- Irrigation efficiency improvement
- Canal lining
- Crop planning support

**Lower Priority** (Kolhapur western):
- Focus on excess water management (drainage)
- Flood protection
- Groundwater exploitation (carefully)

---

## 📐 NUMBERS EVERY STAKEHOLDER SHOULD KNOW

### District Water Balance Summary

**Satara**:
- Area: 10,480 km²
- Cropped area: ~6,000 km² (net)
- Rainfall: 700 mm = 7,400 MCM (million m³)
- Crop water need (ETc): 1000 mm = 6,000 MCM
- **Irrigation requirement**: ~300 mm = 1,800 MCM
- **Sources**: Krishna reservoirs (60%), Groundwater (40%)

**Sangli**:
- Area: 8,572 km²
- Cropped area: ~5,000 km²
- Rainfall: 550 mm = 4,700 MCM
- Crop water need: 1200 mm = 6,000 MCM (high due to sugarcane)
- **Irrigation requirement**: ~650 mm = 3,250 MCM
- **Deficit**: 1,450 MCM (critical!)

**Kolhapur**:
- Area: 7,685 km²
- Cropped area: ~4,500 km²
- Rainfall: 1200 mm = 9,200 MCM (variable)
- Crop water need: 1000 mm = 4,500 MCM
- **Irrigation requirement**: ~300 mm = 1,350 MCM
- **Situation**: Relatively better, but localized deficits

### Crop Water Footprints

Per hectare per year:
- **Sugarcane**: 20,000-25,000 m³ (2000-2500 mm)
- **Cotton**: 7,000-9,000 m³ (700-900 mm)
- **Soybean**: 4,500-5,500 m³ (450-550 mm)
- **Wheat**: 4,500-5,500 m³ (450-550 mm)
- **Jowar**: 4,000-5,000 m³ (400-500 mm)

### Water Productivity

Crop yield per m³ of water:
- **Sugarcane**: 5-8 kg/m³ (80-110 tons/ha)
- **Cotton**: 0.4-0.6 kg/m³ (lint)
- **Soybean**: 0.8-1.2 kg/m³
- **Wheat**: 1.0-1.5 kg/m³

Higher number = more efficient water use

### Economic Water Productivity

Gross income per m³:
- **Sugarcane**: ₹10-15/m³ (assuming ₹3000/ton)
- **Cotton**: ₹15-25/m³
- **Soybean**: ₹20-30/m³
- **Vegetables**: ₹40-80/m³

This explains why farmers prefer sugarcane despite high water use!

---

## 🎯 SCENARIO PLANNING

Use the analysis to evaluate different scenarios:

### Scenario 1: Normal Monsoon (100% rainfall)
- **Current analysis** shows this case
- Irrigation requirement: As calculated
- Strategy: Normal irrigation scheduling

### Scenario 2: Deficit Monsoon (75% rainfall)
- Adjust: P_deficit = P_normal × 0.75
- Irrigation need increases by ~150 mm
- Strategy: Contingency crop plan (shift to drought-tolerant crops)

### Scenario 3: Excess Monsoon (125% rainfall)
- Adjust: P_excess = P_normal × 1.25
- Runoff increases significantly
- Strategy: Maximize water harvesting, reduce irrigation

### Scenario 4: All Drip Irrigation
- ETc remains same, but irrigation efficiency = 0.90
- Gross irrigation reduces by ~35%
- Investment needed: ₹60,000-80,000 per hectare

### Scenario 5: 30% Sugarcane Reduction
- Replace sugarcane with cotton/soybean
- Water saving: ~30% of total irrigation requirement
- Economic impact: Need MSP support for alternative crops

---

## 📞 SUPPORT & RESOURCES

### Government Schemes

**Pradhan Mantri Krishi Sinchayee Yojana (PMKSY)**:
- Subsidy for drip/sprinkler: 50% (small farmers), 40% (others)
- Farm pond construction support

**Jalyukt Shivar Abhiyan (JSA)**:
- Maharashtra's flagship water conservation program
- Community water harvesting structures
- Free technical support

**Soil Health Card Scheme**:
- Soil testing (helps optimize fertilizer and water use)
- Free for all farmers

### Technical Assistance

**Krishi Vigyan Kendras (KVK)**:
- Satara: +91-2162-240280
- Sangli: +91-233-2322078
- Kolhapur: +91-231-2638349

**Agriculture Department**:
- District offices in each district headquarters
- Extension officers at taluka level

**Water Resources Department**:
- Divisional offices: Pune, Kolhapur
- Irrigation management for canal areas

### Online Resources

**India-WRIS**: https://indiawris.gov.in/wris/
- National water resources data

**Bhuvan**: https://bhuvan.nrsc.gov.in/
- ISRO's geospatial data (soil, land use)

**Agro-Met Advisories**: https://mausam.imd.gov.in/
- Weekly weather-based crop advisories

**Market Prices**: https://agmarknet.gov.in/
- MSP, market rates (for crop planning)

---

## ✅ QUICK DECISION GUIDE

**I am a...**

### Farmer:
1. Check **Water Stress map** for your area
2. Note **Irrigation Requirement** (mm/year)
3. Divide by number of irrigations for your crop
4. Plan irrigation schedule accordingly
5. Consider drip for high-water crops

### Agriculture Officer:
1. Review **District Comparison chart**
2. Check **Crop Water Budget** for major crops
3. Identify high irrigation requirement zones on map
4. Plan crop diversification in stressed areas
5. Organize farmer training on water-saving techniques

### Water Manager:
1. Study **Monthly Water Balance** for allocation planning
2. Check **total irrigation requirement** from district stats
3. Compare with available water (reservoir + groundwater)
4. Plan demand management if deficit
5. Schedule releases based on crop calendar

### Policy Maker:
1. Compare **3 districts** (Kolhapur better off than Sangli)
2. Note **water-intensive crops** (sugarcane) in water-scarce areas
3. Evaluate **economic vs. water productivity**
4. Design incentives for crop shift
5. Invest in infrastructure (micro-irrigation, harvesting)

### Researcher:
1. Download all **export files** for detailed analysis
2. Use **GeoTIFFs** in GIS for spatial modeling
3. Integrate with **socio-economic data**
4. Validate with **ground observations**
5. Publish/present findings

---

## 🏆 SUCCESS METRICS

Track these over time (annual updates):

✓ **Total irrigation water use** (aim: reduce by 20% in 5 years)  
✓ **Sugarcane area in water-scarce blocks** (aim: reduce by 30%)  
✓ **Drip irrigation coverage** (aim: increase to 50%)  
✓ **Groundwater levels** (aim: stabilize/recharge)  
✓ **Crop water productivity** (aim: increase by 15%)  
✓ **Farm income** (ensure stable despite crop shift)  

---

**Remember**: Water is precious. Every drop counts. Smart management today = Secure tomorrow. 💧

---

**Need Help?**  
Email: satwikudupi@gmail.com

**Update Frequency**: Run this analysis annually after monsoon season (October-November) for next year's planning.
