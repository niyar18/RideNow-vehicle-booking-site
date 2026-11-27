import type { VehicleType } from "./vehicleConfig";

export const VEHICLE_PHOTO_SRC: Record<VehicleType, string> = {
  scooty: "/fleet/scooty.webp?v=photo-1",
  bike: "/fleet/moto.webp?v=photo-1",
  auto: "/fleet/auto.webp?v=photo-1",
  "e-rickshaw": "/fleet/e-rickshaw.webp?v=photo-1",
  mini: "/fleet/car-mini.webp?v=photo-1",
  car: "/fleet/premier.webp?v=photo-1",
  priority: "/fleet/suv.webp?v=photo-1",
  loading: "/fleet/express-mini.webp?v=photo-1",
  truck: "/fleet/freight.webp?v=photo-1",
};

/** Representative cutouts for the chooser, checkout and fleet. Not actual booked vehicles. */
export const VEHICLE_ART_SRC: Record<VehicleType, string> = {
  scooty: "/vehicle-art/scooty.webp",
  bike: "/vehicle-art/bike.webp",
  auto: "/vehicle-art/auto.webp",
  "e-rickshaw": "/vehicle-art/e-rickshaw.webp",
  mini: "/vehicle-art/mini.webp",
  car: "/vehicle-art/car.webp",
  priority: "/vehicle-art/priority.webp",
  loading: "/vehicle-art/loading.webp",
  truck: "/vehicle-art/truck.webp",
};
