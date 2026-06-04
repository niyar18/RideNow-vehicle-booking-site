import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { message: "Google Maps API Key is not configured on the server." },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  try {
    if (action === "autocomplete") {
      const input = searchParams.get("input") || "";
      const country = searchParams.get("country");
      let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${apiKey}`;
      if (country && country !== "null") {
        url += `&components=country:${country}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      return NextResponse.json(data);
    } 
    
    if (action === "details") {
      const placeId = searchParams.get("placeId") || "";
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,formatted_address,address_components&key=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();
      return NextResponse.json(data);
    } 
    
    if (action === "geocode") {
      const lat = searchParams.get("lat");
      const lng = searchParams.get("lng");
      const address = searchParams.get("address");
      
      let url = "";
      if (address) {
        url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
      } else {
        url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      return NextResponse.json(data);
    }

    return NextResponse.json({ message: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Places Proxy Error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
