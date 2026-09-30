import { NextResponse } from "next/server";

export interface ISmartPickupSpot {
  id: string;
  venueName: string;
  spotName: string;
  category: "airport" | "transit" | "mall" | "campus" | "stadium" | "tech_park";
  lat: number;
  lng: number;
  instructions: string;
  walkingTimeText: string;
  distanceMeters: number;
  badgeText: string;
}

const SMART_PICKUP_ZONES: Array<Omit<ISmartPickupSpot, "distanceMeters" | "walkingTimeText">> = [
  // Delhi NCR / Airports
  {
    id: "sp-del-t3-g4",
    venueName: "Indira Gandhi Int'l Airport (DEL) - T3",
    spotName: "Terminal 3 Departure Ramp - Pillar 18",
    category: "airport",
    lat: 28.5562,
    lng: 77.1000,
    instructions: "Take elevator to 2nd level departure ramp. Driver will wait near Pillar 18.",
    badgeText: "High Driver Visibility",
  },
  {
    id: "sp-del-t3-p4",
    venueName: "Indira Gandhi Int'l Airport (DEL) - T3",
    spotName: "Multi-Level Parking (P4) - Taxi Bay B",
    category: "airport",
    lat: 28.5548,
    lng: 77.0988,
    instructions: "Follow Airport Express signage to P4 Ground Level, Bay B.",
    badgeText: "Covered Pickup Zone",
  },
  {
    id: "sp-del-t1-g1",
    venueName: "Indira Gandhi Int'l Airport (DEL) - T1",
    spotName: "Arrivals Exit Gate 1 - Designated Taxi Bay",
    category: "airport",
    lat: 28.5665,
    lng: 77.1195,
    instructions: "Walk out of Exit Gate 1, taxi stand is 30m on your left.",
    badgeText: "1 Min Walk",
  },

  // Campuses / Universities
  {
    id: "sp-iitd-main",
    venueName: "IIT Delhi Campus",
    spotName: "Main Entrance Gate 1 (Adchini Road)",
    category: "campus",
    lat: 28.5457,
    lng: 77.1928,
    instructions: "Wait right outside Security Check Booth at Gate 1.",
    badgeText: "Quick Driver Match",
  },
  {
    id: "sp-iitd-hostel",
    venueName: "IIT Delhi Campus",
    spotName: "Hostel Zone Gate 3 (SDA Market Exit)",
    category: "campus",
    lat: 28.5490,
    lng: 77.1982,
    instructions: "Located outside SDA Market Gate 3 exit.",
    badgeText: "Student Favorite",
  },

  // Malls & Transit Hubs
  {
    id: "sp-cp-metro-g2",
    venueName: "Rajiv Chowk Metro Station (Connaught Place)",
    spotName: "Gate 2 (Outer Circle - Block B)",
    category: "transit",
    lat: 28.6328,
    lng: 77.2197,
    instructions: "Exit Metro Gate 2. Driver will pull up in the yellow taxi loading lane.",
    badgeText: "Zero Traffic Delay",
  },
  {
    id: "sp-pacific-mall",
    venueName: "Pacific Mall Tagore Garden",
    spotName: "Gate 1 Main Drop & Pickup Circle",
    category: "mall",
    lat: 28.6425,
    lng: 77.1130,
    instructions: "Wait under the Pacific Mall main entrance canopy near Starbucks.",
    badgeText: "Safe Lighting Zone",
  },
  {
    id: "sp-cyber-hub",
    venueName: "DLF Cyber City Gurgaon",
    spotName: "Building 10 Taxi Drop & Pickup Roundabout",
    category: "tech_park",
    lat: 28.4950,
    lng: 77.0895,
    instructions: "Wait at the Building 10 pickup lane next to Cyber Hub walkway.",
    badgeText: "Express Pickup",
  },

  // Mumbai Transit & Airport
  {
    id: "sp-bom-t2",
    venueName: "Chhatrapati Shivaji Maharaj Int'l Airport (BOM) - T2",
    spotName: "P4 East Taxi Bay - Level 1",
    category: "airport",
    lat: 19.0896,
    lng: 72.8656,
    instructions: "Follow signs for Ride-Share / App Cabs to P4 East Level 1.",
    badgeText: "Official Ride Bay",
  },
  {
    id: "sp-bom-cst",
    venueName: "CSMT Railway Terminus Mumbai",
    spotName: "Gate 3 Taxi Hub (Plaza Side)",
    category: "transit",
    lat: 18.9400,
    lng: 72.8353,
    instructions: "Exit Gate 3 facing the heritage plaza.",
    badgeText: "Fast Dispatch",
  }
];

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const latStr = searchParams.get("lat");
    const lngStr = searchParams.get("lng");
    const radiusStr = searchParams.get("radius") || "2500"; // Default 2.5km search window

    const radiusMeters = Number(radiusStr);

    if (!latStr || !lngStr) {
      // If no coordinates provided, return default prominent hubs
      const defaultSpots = SMART_PICKUP_ZONES.slice(0, 4).map(spot => ({
        ...spot,
        distanceMeters: 250,
        walkingTimeText: "3 min walk",
      }));
      return NextResponse.json({ success: true, spots: defaultSpots });
    }

    const userLat = Number(latStr);
    const userLng = Number(lngStr);

    const calculatedSpots: ISmartPickupSpot[] = SMART_PICKUP_ZONES.map(spot => {
      const dist = haversineMeters(userLat, userLng, spot.lat, spot.lng);
      const walkMins = Math.max(1, Math.round(dist / 80)); // ~80m per min average walking speed
      return {
        ...spot,
        distanceMeters: dist,
        walkingTimeText: `${walkMins} min walk (${dist < 1000 ? `${dist}m` : `${(dist / 1000).toFixed(1)}km`})`,
      };
    });

    // Filter spots within the radius, or pick closest top 3 spots if all are beyond radius
    let nearby = calculatedSpots
      .filter(s => s.distanceMeters <= radiusMeters)
      .sort((a, b) => a.distanceMeters - b.distanceMeters);

    if (nearby.length === 0) {
      // Return top 2 closest spots even if slightly further, provided they are within 10km
      nearby = calculatedSpots
        .filter(s => s.distanceMeters <= 10000)
        .sort((a, b) => a.distanceMeters - b.distanceMeters)
        .slice(0, 3);
    }

    return NextResponse.json({
      success: true,
      hasSmartPickup: nearby.length > 0,
      spots: nearby,
    });
  } catch (error) {
    console.error("Smart Pickups API Error:", error);
    return NextResponse.json({ success: false, spots: [] }, { status: 500 });
  }
}
