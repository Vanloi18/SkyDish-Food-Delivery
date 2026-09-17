// Clean corrupt image path
db.fooditems.updateOne(
  { _id: ObjectId("6aaadc6b95c919914db06c8b") },
  { $set: { image: "" } }
);
print("Update finished. Checking item:");
printjson(db.fooditems.findOne({ _id: ObjectId("6aaadc6b95c919914db06c8b") }));
