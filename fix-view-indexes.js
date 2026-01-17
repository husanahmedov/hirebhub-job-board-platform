const { MongoClient } = require('mongodb');

async function fixIndexes() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hirehub';
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db();
    const collection = db.collection('views');
    
    console.log('Current indexes:');
    const indexes = await collection.indexes();
    console.log(JSON.stringify(indexes, null, 2));
    
    // Drop all indexes except _id
    console.log('\nDropping all indexes except _id...');
    for (const index of indexes) {
      if (index.name !== '_id_') {
        console.log(`Dropping index: ${index.name}`);
        await collection.dropIndex(index.name);
      }
    }
    
    // Create the correct unique index
    console.log('\nCreating new unique index on userId and viewRefId...');
    await collection.createIndex(
      { userId: 1, viewRefId: 1 },
      { unique: true }
    );
    
    console.log('\nNew indexes:');
    const newIndexes = await collection.indexes();
    console.log(JSON.stringify(newIndexes, null, 2));
    
    console.log('\n✓ Indexes fixed successfully!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

fixIndexes();
