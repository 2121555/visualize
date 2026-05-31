/**
 * Address Verification — Geocodes addresses via Manus Maps proxy
 * and checks against city bounding boxes from the NWS hail swath.
 */

import { makeRequest, type GeocodingResult } from "./_core/map";
import { CITY_STORM_DATA, getStormConfirmationMessage, type CitySlug } from "../shared/stormData";

export interface VerificationResult {
  verified: boolean;
  lat: number | null;
  lng: number | null;
  formattedAddress: string | null;
  hailSizeConfirmed: string | null;
  confirmationMessage: string;
}

export async function verifyAddressInHailZone(
  fullAddress: string,
  citySlug: string
): Promise<VerificationResult> {
  const cityData = CITY_STORM_DATA[citySlug as CitySlug];

  if (!cityData) {
    return {
      verified: false,
      lat: null,
      lng: null,
      formattedAddress: null,
      hailSizeConfirmed: null,
      confirmationMessage: "We couldn't verify your city. Please check your address and try again.",
    };
  }

  try {
    // Geocode the address via Manus Maps proxy
    const geocodeResult = await makeRequest<GeocodingResult>(
      "/maps/api/geocode/json",
      { address: fullAddress }
    );

    if (geocodeResult.status !== "OK" || !geocodeResult.results.length) {
      // Fallback: trust the city/zip match even if geocoding fails
      return {
        verified: true,
        lat: null,
        lng: null,
        formattedAddress: fullAddress,
        hailSizeConfirmed: cityData.hailSize,
confirmationMessage: getStormConfirmationMessage(fullAddress, citySlug as CitySlug, true),
    };
  }

    const result = geocodeResult.results[0];
    const { lat, lng } = result.geometry.location;
    const formattedAddress = result.formatted_address;

    // Check against bounding box
    const bb = cityData.boundingBox;
    const inBounds =
      lat >= bb.south &&
      lat <= bb.north &&
      lng >= bb.west &&
      lng <= bb.east;

    if (inBounds) {
      return {
        verified: true,
        lat,
        lng,
        formattedAddress,
        hailSizeConfirmed: cityData.hailSize,
        confirmationMessage: getStormConfirmationMessage(formattedAddress, citySlug as CitySlug, true),
      };
    }

    // Outside bounding box but in the general area — still likely affected
    // Check if within 2 miles of bounding box (generous buffer)
    const latBuffer = 0.03; // ~2 miles
    const lngBuffer = 0.04;
    const nearBounds =
      lat >= bb.south - latBuffer &&
      lat <= bb.north + latBuffer &&
      lng >= bb.west - lngBuffer &&
      lng <= bb.east + lngBuffer;

    if (nearBounds) {
      return {
        verified: true,
        lat,
        lng,
        formattedAddress,
        hailSizeConfirmed: cityData.hailSize,
        confirmationMessage: `✓ Your property at ${formattedAddress} is near the confirmed March 10, 2026 hail path. NWS Chicago verified ${cityData.hailSize} hail in the ${cityData.name} area. A free inspection will confirm any damage to your property.`,
      };
    }

    // Outside the zone
    return {
      verified: false,
      lat,
      lng,
      formattedAddress,
      hailSizeConfirmed: null,
      confirmationMessage: `Your property at ${formattedAddress} appears to be outside the confirmed hail path for ${cityData.name}. However, storm damage can extend beyond mapped boundaries. We recommend a free inspection to be sure.`,
    };
  } catch (error) {
    console.error("[AddressVerification] Geocoding failed:", error);
    // Fallback: trust the city/zip match
    return {
      verified: true,
      lat: null,
      lng: null,
      formattedAddress: fullAddress,
      hailSizeConfirmed: cityData.hailSize,
      confirmationMessage: getStormConfirmationMessage(fullAddress, citySlug as CitySlug, true),
    };
  }
}
