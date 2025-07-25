const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = "mongodb://localhost:27017/packgomove";

async function testLocalConnection() {
  console.log('🔄 Testing local MongoDB connection...');
  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected to local MongoDB!');
    
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("✅ Ping successful!");
    
    // Test accessing the packgomove database
    const db = client.db("packgomove");
    console.log('✅ Successfully accessed packgomove database');
    
    // List collections to verify connection
    const collections = await db.listCollections().toArray();
    console.log('📋 Collections in database:', collections.map(c => c.name));
    
  } catch (error) {
    console.error('❌ Local MongoDB connection failed:', error.message);
  } finally {
    await client.close();
    console.log('🔌 MongoDB connection closed');
  }
}

testLocalConnection(); 