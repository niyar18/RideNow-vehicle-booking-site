const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://ridenow:z87OklKiNsn0G61x@clusterall.9k3vix8.mongodb.net/ridenow";

function haversineDistance(coords1, coords2) {
  const [lon1, lat1] = coords1;
  const [lon2, lat2] = coords2;
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

async function testBookingFlow() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB for testing booking...");

  const User = mongoose.connection.db.collection('users');
  const Vehicle = mongoose.connection.db.collection('vehicles');
  const Booking = mongoose.connection.db.collection('bookings');

  // 1. Find or choose a customer (user)
  const customer = await User.findOne({ role: 'user' });
  if (!customer) {
    console.log("No customer user found in database. Please register/create a user.");
    await mongoose.disconnect();
    return;
  }
  console.log(`\nUsing customer: ${customer.name} (${customer.email})`);

  // 2. Setup mock pickup coordinates (in Delhi, India or close to a driver)
  // Let's use coordinates: pickup = [77.2090, 28.6139] (New Delhi)
  const pickupLng = 77.2090;
  const pickupLat = 28.6139;
  const targetVehicleType = 'car';

  console.log(`Pickup coordinates: Lng: ${pickupLng}, Lat: ${pickupLat}`);
  console.log(`Requested vehicle category: ${targetVehicleType}`);

  // 3. Find or setup a nearby driver/vendor
  let driver = await User.findOne({ role: 'vendor' });
  if (!driver) {
    console.log("No vendor found in the database. Creating a mock vendor...");
    const result = await User.insertOne({
      name: "Mock Driver",
      email: "mockdriver@ridenow.com",
      role: "vendor",
      isOnline: true,
      vendorStatus: "approved",
      vendorOnboardingStep: 7,
      videoKycStatus: "approved",
      location: {
        type: "Point",
        coordinates: [77.2150, 28.6200] // ~1km from pickup
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });
    driver = await User.findOne({ _id: result.insertedId });
  } else {
    // Make sure driver is online and has coordinates close to pickup for matching
    console.log(`\nFound existing driver: ${driver.name}. Setting them online and near pickup...`);
    await User.updateOne(
      { _id: driver._id },
      { 
        $set: { 
          isOnline: true,
          location: {
            type: "Point",
            coordinates: [77.2150, 28.6200] // [longitude, latitude] (~1km away)
          }
        }
      }
    );
    driver = await User.findOne({ _id: driver._id });
  }

  // 4. Ensure driver has a vehicle in this category
  let vehicle = await Vehicle.findOne({ owner: driver._id });
  if (!vehicle) {
    console.log("No vehicle found for the driver. Inserting a mock vehicle...");
    const vResult = await Vehicle.insertOne({
      owner: driver._id,
      type: targetVehicleType,
      number: "DL3C-AB-1234",
      vehicleModel: "Hyundai i20",
      status: "approved",
      baseFare: 50,
      pricePerKm: 15,
      waitingCharge: 2,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    vehicle = await Vehicle.findOne({ _id: vResult.insertedId });
  } else {
    // Make sure vehicle type matches the target booking type
    await Vehicle.updateOne(
      { _id: vehicle._id },
      { $set: { type: targetVehicleType, status: "approved" } }
    );
    vehicle = await Vehicle.findOne({ _id: vehicle._id });
  }

  console.log(`Driver Location: [${driver.location.coordinates[0]}, ${driver.location.coordinates[1]}]`);
  console.log(`Driver Vehicle: ${vehicle.vehicleModel} (${vehicle.type})`);

  // 5. Test Matching geospatial query (Simulate what the API does)
  const activeVehicles = await Vehicle.find({ type: targetVehicleType }).toArray();
  const vehicleOwnerIds = activeVehicles.map(v => v.owner);

  // Find online vendors within 10km of pickup
  // Note: Mongo's $near needs 2dsphere index on users.location
  const matchedVendors = await User.find({
    _id: { $in: vehicleOwnerIds },
    role: "vendor",
    isOnline: true,
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [pickupLng, pickupLat]
        },
        $maxDistance: 10000
      }
    }
  }).toArray();

  console.log(`\nGeospatial search matched ${matchedVendors.length} driver(s):`);
  
  if (matchedVendors.length === 0) {
    console.log("❌ Driver matching failed. Check if geospatial indexes are correct or if driver location format is correct.");
    await mongoose.disconnect();
    return;
  }

  const sortedCandidates = matchedVendors.map(v => {
    const coords = v.location.coordinates;
    const distance = haversineDistance([pickupLng, pickupLat], coords);
    return { name: v.name, email: v.email, distance, _id: v._id };
  }).sort((a, b) => a.distance - b.distance);

  sortedCandidates.forEach((c, idx) => {
    console.log(`[${idx + 1}] Driver: ${c.name}, Distance: ${c.distance.toFixed(3)} km`);
  });

  console.log(`\nNearest matched candidate: ${sortedCandidates[0].name}`);
  console.log("✅ Geospatial search matching logic is fully operational!");

  await mongoose.disconnect();
}

testBookingFlow().catch(err => console.error(err));
