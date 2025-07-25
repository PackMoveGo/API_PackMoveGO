const { MongoClient, ServerApiVersion } = require('mongodb');

// Try different connection string formats
const uri1 = "mongodb+srv://supportPackMoveGo:NAgeobxA37ebaUue@packmovego.9yxraau.mongodb.net/packgomove?retryWrites=true&w=majority&appName=PackMoveGo&directConnection=false&ssl=true";
const uri2 = "mongodb+srv://supportPackMoveGo:NAgeobxA37ebaUue@packmovego.9yxraau.mongodb.net/?retryWrites=true&w=majority&appName=PackMoveGo";
const uri3 = "mongodb+srv://supportPackMoveGo:NAgeobxA37ebaUue@packmovego.9yxraau.mongodb.net/packgomove?retryWrites=true&w=majority";

async function testConnection(uri, name) {
  console.log(`\n🔄 Testing ${name}...`);
  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    family: 4
  });

  try {
    await client.connect();
    console.log(`✅ ${name} - Connected successfully!`);
    
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(`✅ ${name} - Ping successful!`);
    
    return true;
  } catch (error) {
    console.error(`❌ ${name} - Failed:`, error.message);
    return false;
  } finally {
    await client.close();
  }
}

async function run() {
  console.log('🧪 Testing different MongoDB connection approaches...');
  
  const results = await Promise.all([
    testConnection(uri1, 'URI with all options'),
    testConnection(uri2, 'URI without database'),
    testConnection(uri3, 'URI with minimal options')
  ]);
  
  console.log('\n📊 Results:');
  console.log('URI with all options:', results[0] ? '✅ Success' : '❌ Failed');
  console.log('URI without database:', results[1] ? '✅ Success' : '❌ Failed');
  console.log('URI with minimal options:', results[2] ? '✅ Success' : '❌ Failed');
}

run().catch(console.dir); 