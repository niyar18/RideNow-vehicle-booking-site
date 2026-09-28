const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://ridenow:z87OklKiNsn0G61x@clusterall.9k3vix8.mongodb.net/ridenow";

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  const users = await mongoose.connection.db.collection('users').find({ role: 'vendor' }).toArray();
  console.log("Vendors:");
  for (const user of users) {
    console.log(`- ID: ${user._id}, Name: ${user.name}, Email: ${user.email}, Step: ${user.vendorOnboardingStep}, Status: ${user.vendorStatus}`);
    const vehicles = await mongoose.connection.db.collection('vehicles').find({ owner: user._id }).toArray();
    for (const v of vehicles) {
      console.log(`  * Vehicle Model: ${v.vehicleModel}, Type: ${v.type}, Number: ${v.number}, Status: ${v.status}, BaseFare: ${v.baseFare}, PricePerKm: ${v.pricePerKm}, Waiting: ${v.waitingCharge}`);
    }
  }

  await mongoose.disconnect();
}

main().catch(err => console.error(err));
