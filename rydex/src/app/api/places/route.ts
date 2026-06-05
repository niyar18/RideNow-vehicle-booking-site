import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  try {
    if (action === "autocomplete") {
      const input = searchParams.get("input") || "";
      const country = searchParams.get("country");
      let url = `https://photon.komoot.io/api/?q=${encodeURIComponent(input)}`;
      if (country && country !== "null") {
        url += `&countrycode=${country}`;
      }
      
      const res = await fetch(url, {
        headers: {
          "User-Agent": "RideNow-Vehicle-Booking/1.0 (contact: support@ridenow.app)"
        }
      });
      
      if (!res.ok) {
        console.error(`Photon Autocomplete failed with status ${res.status}`);
        return NextResponse.json({ predictions: [], status: "OK" });
      }
      
      const data = await res.json();

      // Map Photon FeatureCollection to Google-compatible Places Autocomplete format
      const predictions = (data?.features || []).map((feature: any) => {
        const props = feature.properties || {};
        const coords = feature.geometry?.coordinates || [0, 0]; // [lng, lat]
        const streetAndNumber = [props.housenumber, props.street].filter(Boolean).join(" ");
        const localArea = props.district || props.suburb || props.locality;
        const cityTown = props.city || props.town || props.village;
        const parts: string[] = [props.name];
        if (streetAndNumber && streetAndNumber !== props.name) parts.push(streetAndNumber);
        if (localArea && localArea !== props.name) parts.push(localArea);
        if (cityTown && cityTown !== props.name) parts.push(cityTown);
        if (props.postcode) parts.push(props.postcode);
        if (props.state && props.state !== props.name) parts.push(props.state);
        if (props.country && props.country !== props.name) parts.push(props.country);
        const description = parts.filter(Boolean).join(", ");

        // Encode coordinates and country code in place_id to make details retrieval zero-latency
        const place_id = `photon_${coords[1]}_${coords[0]}_${props.countrycode || "in"}_${encodeURIComponent(description)}`;

        return {
          place_id,
          description,
        };
      });

      return NextResponse.json({ predictions, status: "OK" });
    } 
    
    if (action === "details") {
      const placeId = searchParams.get("placeId") || "";
      if (placeId.startsWith("photon_")) {
        const parts = placeId.split("_");
        if (parts.length >= 5) {
          const [_, lat, lng, countrycode, ...descParts] = parts;
          const description = decodeURIComponent(descParts.join("_"));
          return NextResponse.json({
            status: "OK",
            result: {
              formatted_address: description,
              geometry: {
                location: {
                  lat: Number(lat),
                  lng: Number(lng),
                },
              },
              address_components: [
                {
                  long_name: countrycode.toUpperCase(),
                  short_name: countrycode.toLowerCase(),
                  types: ["country"],
                },
              ],
            },
          });
        }
      }
      return NextResponse.json({ status: "INVALID_REQUEST", message: "Invalid placeId format" }, { status: 400 });
    } 
    
    if (action === "geocode") {
      const lat = searchParams.get("lat");
      const lng = searchParams.get("lng");
      const address = searchParams.get("address");
      
      if (address) {
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(address)}`;
        const res = await fetch(url, {
          headers: {
            "User-Agent": "RideNow-Vehicle-Booking/1.0 (contact: support@ridenow.app)"
          }
        });
        
        if (!res.ok) {
          console.error(`Photon Geocode address failed with status ${res.status}`);
          return NextResponse.json({ results: [], status: "OK" });
        }
        
        const data = await res.json();
        
        const results = (data?.features || []).map((feature: any) => {
          const props = feature.properties || {};
          const coords = feature.geometry?.coordinates || [0, 0];
          const streetAndNumber = [props.housenumber, props.street].filter(Boolean).join(" ");
          const localArea = props.district || props.suburb || props.locality;
          const cityTown = props.city || props.town || props.village;
          const parts: string[] = [props.name];
          if (streetAndNumber && streetAndNumber !== props.name) parts.push(streetAndNumber);
          if (localArea && localArea !== props.name) parts.push(localArea);
          if (cityTown && cityTown !== props.name) parts.push(cityTown);
          if (props.postcode) parts.push(props.postcode);
          if (props.state && props.state !== props.name) parts.push(props.state);
          if (props.country && props.country !== props.name) parts.push(props.country);
          const description = parts.filter(Boolean).join(", ");
          
          return {
            formatted_address: description,
            geometry: {
              location: {
                lat: coords[1],
                lng: coords[0],
              },
            },
            address_components: [
              {
                long_name: props.country || "India",
                short_name: String(props.countrycode || "in").toLowerCase(),
                types: ["country"],
              },
            ],
          };
        });
        
        return NextResponse.json({ results, status: "OK" });
      } else if (lat && lng) {
        const url = `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`;
        const res = await fetch(url, {
          headers: {
            "User-Agent": "RideNow-Vehicle-Booking/1.0 (contact: support@ridenow.app)"
          }
        });
        
        if (!res.ok) {
          console.error(`Photon Reverse Geocode failed with status ${res.status}`);
          return NextResponse.json({ results: [], status: "OK" });
        }
        
        const data = await res.json();
        
        const results = (data?.features || []).map((feature: any) => {
          const props = feature.properties || {};
          const coords = feature.geometry?.coordinates || [0, 0];
          const streetAndNumber = [props.housenumber, props.street].filter(Boolean).join(" ");
          const localArea = props.district || props.suburb || props.locality;
          const cityTown = props.city || props.town || props.village;
          const parts: string[] = [props.name];
          if (streetAndNumber && streetAndNumber !== props.name) parts.push(streetAndNumber);
          if (localArea && localArea !== props.name) parts.push(localArea);
          if (cityTown && cityTown !== props.name) parts.push(cityTown);
          if (props.postcode) parts.push(props.postcode);
          if (props.state && props.state !== props.name) parts.push(props.state);
          if (props.country && props.country !== props.name) parts.push(props.country);
          const description = parts.filter(Boolean).join(", ");
          
          return {
            formatted_address: description,
            geometry: {
              location: {
                lat: coords[1],
                lng: coords[0],
              },
            },
            address_components: [
              {
                long_name: props.country || "India",
                short_name: String(props.countrycode || "in").toLowerCase(),
                types: ["country"],
              },
            ],
          };
        });
        
        return NextResponse.json({ results, status: "OK" });
      }
      return NextResponse.json({ status: "INVALID_REQUEST", message: "Missing coordinates or address" }, { status: 400 });
    }

    return NextResponse.json({ message: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Places Proxy Error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
