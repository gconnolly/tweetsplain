//Quick and dirty script that dumps an account's history into MongoDB

const TWITTER_ACCOUNT_ID = prcoess.env.TWITTER_ACCOUNT_ID;
const MONGO_URI = process.env.MONGO_URI;
const GNIP_URI = process.env.GNIP_URI;
const MONGO_DATABASE = process.env.MONGO_DATABASE;
const MONGO_COLLECTION = process.env.MONGO_COLLECTION;

const MongoClient = require('mongodb').MongoClient;
const request = require('request');

var results = [];

const client = new MongoClient(MONGO_URI);

function getTweets(next){
    console.log('Fetching Tweets');
    let options = {
        method: 'POST',
        url: GNIP_URI,
        headers: 
        {  'cache-control': 'no-cache',
            Authorization: AUTH_STRING,
            'Content-Type': 'application/json'},
        body: { query: `from:${TWITTER_ACCOUNT_ID}`, fromDate: "200701010000", maxResults: 500},
        json: true
    };

    if(next){
        options.body.next = next;
    }

    return new Promise((resolve, reject)=>{
        request(options, function (error, response, body) {
            if (error) reject(error);
            results = results.concat(body.results);
            setTimeout(()=>{ //Try to stay below the Gnip API limits
                resolve(body);
            }, 500);
        });
    });
}

async function fetchAllTweets(next){
    let result = await getTweets(next);

    if(result.next){
        return await fetchAllTweets(result.next);
    } else {
        return results;
    }
}

client.connect( err => {
    if(err) throw err;

    const db = client.db(MONGO_DATABASE);
    const collection = db.collection(MONGO_COLLECTION);

    fetchAllTweets().then(()=>{
        console.log(`We got ${results.length} Tweets!`)
        collection.insertMany(results);
        client.close();
    });  
});

