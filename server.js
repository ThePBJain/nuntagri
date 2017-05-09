'use strict';

// Messenger API integration example
// We assume you have:
// * a Wit.ai bot setup (https://wit.ai/docs/quickstart)
// * a Messenger Platform setup (https://developers.facebook.com/docs/messenger-platform/quickstart)
// You need to `npm install` the following dependencies: body-parser, express, request.
//
// 1. npm install body-parser express request
// 2. Download and install ngrok from https://ngrok.com/download
// 3. ./ngrok http 8445
// 4. WIT_TOKEN=your_access_token FB_APP_SECRET=your_app_secret FB_PAGE_TOKEN=your_page_token node examples/messenger.js
// 5. Subscribe your page to the Webhooks using verify_token and `https://<your_ngrok_io>/webhook` as callback URL.
// 6. Talk to your bot on Messenger!

const bodyParser = require('body-parser');
const crypto = require('crypto');
const express = require('express');
const fetch = require('node-fetch');
const request = require('request');
var jsonQuery = require('json-query');
var schedule = require('node-schedule');
var http = require('http');
var https = require('https');
var twilio = require('twilio');
const MessagingResponse = require('twilio').twiml.MessagingResponse;
//twilio specific
var accountSid = 'AC8501e05ec858043aaed043218ad665fb'; // Your Account SID from www.twilio.com/console
var authToken = 'f3f5184f0b84ad7ce383b62b134050a0';   // Your Auth Token from www.twilio.com/console
var client = new twilio(accountSid, authToken);

//moving on...
let Wit = null;
let log = null;
try {
  // if running from repo
  Wit = require('../').Wit;
  log = require('../').log;
} catch (e) {
  Wit = require('node-wit').Wit;
  log = require('node-wit').log;
}

// Webserver parameter
//const PORT = process.env.PORT || 8443; //443
const PORT = 443;

// Wit.ai parameters
const WIT_TOKEN = process.env.WIT_TOKEN;

// Messenger API parameters
const FB_PAGE_ID = process.env.FB_PAGE_ID;
if (!FB_PAGE_ID) { throw new Error('missing FB_PAGE_ID') }
const FB_PAGE_TOKEN = process.env.FB_PAGE_TOKEN;
if (!FB_PAGE_TOKEN) { throw new Error('missing FB_PAGE_TOKEN') }
const FB_APP_SECRET = process.env.FB_APP_SECRET;
if (!FB_APP_SECRET) { throw new Error('missing FB_APP_SECRET') }

let FB_VERIFY_TOKEN = null;
crypto.randomBytes(8, (err, buff) => {
  if (err) throw err;
  FB_VERIFY_TOKEN = buff.toString('hex');
  console.log(`/webhook will accept the Verify Token "${FB_VERIFY_TOKEN}"`);
});

// ----------------------------------------------------------------------------
// Messenger API specific code

// See the Send API reference
// https://developers.facebook.com/docs/messenger-platform/send-api-reference

const fbMessage = (id, text) => {
  const body = JSON.stringify({
    recipient: { id },
    message: { text },
  });
  console.log(body);
  const qs = 'access_token=' + encodeURIComponent(FB_PAGE_TOKEN);
  return fetch('https://graph.facebook.com/me/messages?' + qs, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body,
  })
  .then(rsp => rsp.json())
  .then(json => {
    if (json.error && json.error.message) {
		console.log("Failed in sending json in fbMessage");
      throw new Error(json.error.message);
    }
    return json;
  });
};

function callSendAPI(messageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: FB_PAGE_TOKEN },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      console.log("Successfully sent generic message with id %s to recipient %s",
        messageId, recipientId);
    } else {
      console.error("Unable to send Genericmessage.");
      console.error(response);
      console.error(error);
    }
  });
}

// ----------------------------------------------------------------------------
// Consensus API specific code

// See the POS API reference on Confluence
// You can put all new connections to Consensus APIs over here





// ----------------------------------------------------------------------------
// Wit.ai bot specific code

// This will contain all user sessions.
// Each session has an entry:
// sessionId -> {fbid: facebookUserId, context: sessionState, numItems: ItemsInCart, type: TypeOfItemsInList, list: jsonQueryOfItems, cart: ArrayOfItemsInPreviousCart}

//Set this up to put session as a user db table on mongodb
const sessions = {};

const findOrCreateSession = (fbid) => {
  let sessionId;
  // Let's see if we already have a session for the user fbid
  Object.keys(sessions).forEach(k => {
    if (sessions[k].fbid === fbid) {
      // Yep, got it!
      sessionId = k;
    }
  });
  if (!sessionId) {
    // No session found for user fbid, let's create a new one
    sessionId = new Date().toISOString();
    sessions[sessionId] = {
		fbid: fbid,
		context: {

		},
		name: "Pranav Jain",
		seller: null,
		buyer: null,
		deliverer: null,
		location: null
	};
  }
  return sessionId;
};


// Method to read entities and get values if exists
const firstEntityValue = (entities, entity) => {
  const val = entities && entities[entity] &&
    Array.isArray(entities[entity]) &&
    entities[entity].length > 0 &&
    entities[entity][0].value
  ;
  if (!val) {
    return null;
  }
  return typeof val === 'object' ? val.value : val;
};




//search method to search through the catalog.json and get items
const selectDeliverers = (order, sessionId) => {
	var bestdeliverer = null;
	var closest = 10000;
	Object.keys(sessions).forEach(k => {
		if (sessions[k].deliverer != null) {
		// Yep, got it!
		var deliverer = sessions[k].deliverer;
		if(deliverer.capacity >= order.amount){
			bestdeliverer = deliverer;
		}
	}
	bestdeliverer.queue.push(order);
	});



};
//-----------------------------------------------------------------
// Our bot actions
// Write new actions over here that will be called by Wit.ai stories
const actions = {
  send({sessionId}, {text}) {
    // Our bot has something to say!
    //add functionality to send things to voicebox too! Differentiate between facebook and non, by session info...
    // Let's retrieve the Facebook user whose session belongs to
    const recipientId = sessions[sessionId].fbid;
    if (recipientId) {
		// Yay, we found our recipient!
		// Let's forward our bot response to her.
		// We return a promise to let our bot know when we're done sending
		if(recipientId == "308115649579045"){
			sessions[sessionId].message = text;
			return Promise.resolve()
			/*.then(() => null)
			.catch((err) => {
				console.error(
					'Oops! An error occurred while forwarding the response to',
					recipientId,
					':',
					err.stack || err
				);
			});*/
	  }else{
		return fbMessage(recipientId, text)
		.then(() => null)
		.catch((err) => {
			console.error(
				'Oops! An error occurred while forwarding the response to',
				recipientId,
				':',
				err.stack || err
				);
			});
		}
    } else {
      console.error('Oops! Couldn\'t find user for session:', sessionId);
      // Giving the wheel back to our bot
      //could do voicebox stuff here.
      return Promise.resolve()
    }
  },
  getProductList({sessionId, context, entities}) {
	  //used only for demo to find cart that addToCart method will send it too.
    return new Promise(function(resolve, reject) {
		var list = "\n";
		Object.keys(sessions).forEach(k => {
			if (sessions[k].seller != null) {
			// Yep, got it!
			for(var i=0; i < sessions[k].seller.list.length; i++){
				list += (sessions[k].seller.list[i].name + ": " + sessions[k].seller.list[i].amount + "kgs.\n");
			}
		}
		context.list = list;
		});
      return resolve(context);
    });
  },
	parseProducts({sessionId, context, entities}) {
		//used only for demo to find cart that addToCart method will send it too.
		return new Promise(function(resolve, reject) {
			//parse
			var measurement = firstEntityValue(entities, 'measurement');
			var load = parseFloat(firstEntityValue(entities, 'load'));
			var product = firstEntityValue(entities, 'product');
			//failure flag
			var flag = false;
			//pput everything in kilos
			console.log("Load: " + load + "\nMeasurement: " + measurement);
			if(measurement != "Kilograms"){
				if(measurement == "Pounds"){
					//convert pounds to kilos
					load = load * 0.453592;
				}else if(measurement == "Tons"){
					//Tons to kilos
					load = load * 907.185;
				}else if(measurement == "Cartons"){
					load = load * 0.680389;
				}else{
					flag = true;
				}
			}

			if(sessions[sessionId].seller != null){
				delete context.successNew;
				context.success = true;
				var temp = {name: product, amount: load};
				var didUpdate = false;
				for(var i=0; i < sessions[sessionId].seller.list.length; i++){
					if(sessions[sessionId].seller.list[i].name == product){
						sessions[sessionId].seller.list[i].amount = load;
						didUpdate = true;
					}
				}
				if(!didUpdate) {
					sessions[sessionId].seller.list.push(temp);
				}
			}else{
        //sessions[sessionId].buyer == null && sessions[sessionId].deliverer == null
				if(true){
					delete context.success;
					context.successNew = true;
					sessions[sessionId].seller = {
						list: [{name: product, amount: load}]
					}
				}else{
					console.log("In HERE----------------");
					flag = true;
				}
			}
			console.log("Load: " + load + "\nMeasurement: " + measurement + "\nFlag: " + flag);
			console.log("Context: " + JSON.stringify(context));
			if(flag){
				delete context.successNew;
				delete context.success;
				context.fail = true;
			}else{
				delete context.fail;
			}

			console.log("Context: " + JSON.stringify(context));
			return resolve(context);
		});
	},
	createOrder({sessionId, context, entities}) {
		//used only for demo to find cart that addToCart method will send it too.
		return new Promise(function(resolve, reject) {
			var measurement = firstEntityValue(entities, 'measurement');
			var load = parseFloat(firstEntityValue(entities, 'load'));
			var product = firstEntityValue(entities, 'product');
			var index = 0;
			var theProduct = null;
			console.log("Load: " + load + "\nMeasurement: " + measurement + "\nProduct: " + product);
			Object.keys(sessions).forEach(k => {
				if (sessions[k].seller != null) {
				// Yep, got it!
				for(var i=0; i < sessions[k].seller.list.length; i++){
					if(sessions[k].seller.list[i].name == product){
						console.log(sessions[k].seller.list[i].name);
						if(sessions[k].seller.list[i].amount >= load){
							theProduct = sessions[k];
							index = i;
						}
						if(sessions[k].seller.list[i].amount <= 0){
							sessions[k].seller.list.splice(i,1);
						}
					}
				}
			}
			});
			//console.log("Load: " + load + "\nMeasurement: " + measurement + "\theProduct: " + JSON.stringify(theproduct));
			if(theProduct){
				console.log("theProduct does exist");
				if(sessions[sessionId].buyer != null){
					//add order to list of orders
					var temp = {
						start: theProduct.location,
						name: product,
						amount: load,
						end: sessions[sessionId].location
					}
					sessions[sessionId].buyer.orders.push(temp);
					theProduct.seller.list[index].amount -= load;
					delete context.fail;
					context.success = true;
				}else{
					console.log(JSON.stringify(sessions[sessionId]));
          //todo: get rid of this bottom part to make it so that sellers can be buyers and vice versa.
          //sessions[sessionId].seller == null && sessions[sessionId].deliverer == null
					if(true){
						sessions[sessionId].buyer = {
							orders: [
								{
									start: theProduct.location,
									name: product,
									amount: load,
									end: sessions[sessionId].location
								}
							]
						};
						theProduct.seller.list[index].amount -= load;
						delete context.fail;
						context.success = true;
					}else{
						console.log("Failed because user is currently a seller or deliverer...");
						delete context.success;
						context.fail = true;
					}
				}
			}else{
				console.log("Everything failed. Never found theProduct");
				delete context.success;
				context.fail = true;
			}
			console.log("createOrder: " + JSON.stringify(context));
			return resolve(context);
		});
	},
	verifyAddress({sessionId, context, entities}) {
		//used only for demo to find cart that addToCart method will send it too.
		return new Promise(function(resolve, reject) {
			var loc = firstEntityValue(entities, 'location')
			if(loc){
			sessions[sessionId].location = loc;
			}else{
				sessions[sessionId].location = "246 Saint Phillip Ct.";
			}
			delete context.fail;
			context.success = true;
			return resolve(context);
		});
	},
	complete({sessionId, context, entities}) {
		//used only for demo to find cart that addToCart method will send it too.
		return new Promise(function(resolve, reject) {

			context.complete = true;
			return resolve(context);
		});
	},
	delivererInfo({sessionId, context, entities}) {
		//used only for demo to find cart that addToCart method will send it too.
		return new Promise(function(resolve, reject) {
			var load = parseFloat(firstEntityValue(entities, 'load'))
			var measurement = firstEntityValue(entities, 'measurement')
			console.log("Load: " + load + "\n Measurement: " + measurement);
			sessions[sessionId].deliverer = {
			capacity: 0,
			queue: [],
			range: 0,
			rate: 5
			}
			if(measurement){
				if(measurement == "Kilograms"){
					sessions[sessionId].deliverer.capacity = load;
				}
				if(measurement == "Pounds"){
					sessions[sessionId].deliverer.capacity = load;
				}
				if(measurement == "Tons"){
					sessions[sessionId].deliverer.capacity = load;
				}
				if(measurement == "Cartons"){
					sessions[sessionId].deliverer.capacity = load;
				}
				if(measurement == "Miles"){
					sessions[sessionId].deliverer.range = load;
				}
				if(measurement == "Kilometer"){
					sessions[sessionId].deliverer.range = load;
				}
				delete context.fail;
				context.success = true;
			}else{
				delete context.success;
				context.fail = true;
			}

			return resolve(context);
		});
	},
  getItem({sessionId, context, entities}) {
	  //item = type
	  /*var blacklist = sessions[sessionId].fbid;//308115649579044 -  should not take results from this fbid because it's us.
	  if(blacklist == "308115649579044"){
		  console.log("got request from self");
		  return Promise.resolve()
	  }*/
    return new Promise(function(resolve, reject) {
	  var fs = require('fs');
	  var data = JSON.parse(fs.readFileSync('catalog.json', 'utf8'));
	  var parameter = firstEntityValue(entities, 'search_query')
	  var brand = firstEntityValue(entities, 'brand')
	  var type = firstEntityValue(entities, 'item')
	  //havent set up color yet on wit.ai
	  var color = firstEntityValue(entities, 'color')

	  const recipientId = sessions[sessionId].fbid;
	  console.log("Parameter: " + parameter + "\nType: " + type + "\nBrand: " + brand);
	  var list = sessions[sessionId].list;
	  //if we find list in the session (i.e old list)
	  if(list){
			delete context.missingItem;
			//write code here
			console.log("We found the old list!!");
			list = search(list, sessionId, type, parameter, brand, color);
			var namelist = "";
			if(list.length > 1){
				for(var i=0; i < list.length-1; i++){
					namelist += (list[i] + ", ");
				}
				namelist += "and " + list[list.length-1];
			}else if(list.length == 1){
				namelist = list[0];
			}
			//resolve context and return items;
			if(list.length > 3){
				//when 3 or more, use brand names to simplify message
				type = sessions[sessionId].type;
				var names = getBrandNames(type, sessionId);
				delete context.item;
				delete context.weDontHave;
				context.items = names;
			}else if(list.length > 1){
				//when more than one but less than 3
				delete context.item;
				delete context.weDontHave;
				sendGenericMessage(sessionId);
				context.items = namelist;
			}else if(list.length == 0){
				sessions[sessionId].list = null;
				sessions[sessionId].type = null;
				context.weDontHave = true;
				delete context.item;
				delete context.items;
			}else{
				//this senario, finish and delete the session/context.
				addToSessionCart(sessionId);
				var index = sessions[sessionId].cart.length;
				var flag = (recipientId != "308115649579045");
				addToCart(sessionId, index-1, flag);
				sessions[sessionId].list = null;
				sessions[sessionId].type = null;
				delete context.items;
				delete context.weDontHave;
				context.item = namelist;
			}

	  }else{
		  //otherwise we need to create a new list for us to mess around with
		  //we need a type to get started
		if (type) {
			delete context.missingItem;
			//resolve type
			var list = jsonQuery('Category.Sub-Category.Type[*name~/'+type+'/i]', {
				data: data,
				allowRegexp: true
			}).value;
			if(list.length == 0){
				context.missingItem = true;
				delete context.item;
				delete context.weDontHave;
				delete context.items;
			}else{
				//dont need missingItem anymore
				delete context.missingItem;
				//call method to set session's new list and return list of items
				list = search(list, sessionId, type, parameter, brand, color);
				//format speech correctly
				var namelist = "";
				if(list.length > 1){
					for(var i=0; i < list.length-1; i++){
						namelist += (list[i] + ", ");
					}
					namelist += "and " + list[list.length-1];
				}else if(list.length == 1){
					namelist = list[0];
				}
				//resolve context and return items;
				if(list.length > 3){
					//when 6 or more, use brand names to simplify       **WARNING** This part could fail if list contains different Types b/c type is unknown...
					type = sessions[sessionId].type;
					var names = getBrandNames(type, sessionId);
					delete context.item;
					delete context.weDontHave;
					context.items = names;
				}else if(list.length > 1){
					//when more than one but less than 6
					delete context.item;
					delete context.weDontHave;
					sendGenericMessage(sessionId);
					context.items = namelist;
				}else if(list.length == 0){
					sessions[sessionId].list = null;
					sessions[sessionId].type = null;
					context.weDontHave = true;
					delete context.item;
					delete context.items;
				}else{
					//this senario, finish and delete the session.
					addToSessionCart(sessionId);
					var index = sessions[sessionId].cart.length;
					var flag = (recipientId != "308115649579045");
					addToCart(sessionId, index-1, flag);
					sendGenericMessage(sessionId);
					sessions[sessionId].list = null;
					sessions[sessionId].type = null;
					delete context.items;
					delete context.weDontHave;
					context.item = namelist;
				}
			}
		} else {
			context.missingItem = true;
			delete context.weDontHave;
			delete context.item;
			delete context.items;
		}
	  }
      return resolve(context);
    });
  },
  // You should implement your custom actions here
  // See https://wit.ai/docs/quickstart
};

// Setting up our bot
const wit = new Wit({
  accessToken: WIT_TOKEN,
  actions,
  logger: new log.Logger(log.INFO)
});

// Starting our webserver and putting it all together
const app = express();
app.use(({method, url}, rsp, next) => {
  rsp.on('finish', () => {
    console.log(`${rsp.statusCode} ${method} ${url}`);
  });
  next();
});
app.use(bodyParser.json({ verify: verifyRequestSignature }));

// Webhook setup
app.get('/webhook', (req, res) => {
  if (req.query['hub.mode'] === 'subscribe' &&
    req.query['hub.verify_token'] === FB_VERIFY_TOKEN) {
    res.send(req.query['hub.challenge']);
  } else {
    res.sendStatus(400);
  }
});
//to test if it works...

app.get('/', function (req, res) {
  res.send('Hello Pranav... What are you doing here?\n');
});

//message handler for twilio
app.post('/twilio', function (req, res) {
	var text = req.body.Body; //message from twilio to send to Wit.
	const twimlResp = new MessagingResponse();
	console.log(req);
	console.log("\n\n Test: " + text);
	
	// We retrieve the user's current session, or create one if it doesn't exist
	// This is needed for our bot to figure out the conversation history
	//figure out how to fix sender to be twilio only
	const sender = "308115649579045";
	const sessionId = findOrCreateSession(sender);
	if(text){
		// We received a text message
			
        // Let's forward the message to the Wit.ai Bot Engine
        // This will run all actions until our bot has nothing left to do
        wit.runActions(
			sessionId, // the user's current session
			text, // the user's message
			sessions[sessionId].context // the user's current session state
        ).then((context) => {
			// Our bot did everything it has to do.
			// Now it's waiting for further messages to proceed.
			console.log('Waiting for next user messages');
			res.writeHead(200, {'Content-Type': 'text/xml'});
			twimlResp.message(sessions[sessionId].message);
			res.send(twimlResp.toString());
			// Based on the session state, you might want to reset the session.
			// This depends heavily on the business logic of your bot.
			// Example:
			// if (context['done']) {
			//   delete sessions[sessionId];
			// }
			
			//Our logic is: if we have had success, failure, a final item, or we updated cart...
			//reset the context
			console.log("Context: " + JSON.stringify(context));
			if(context.number || context.failure || context.item || context.success){
				context = {};
			}
			// Updating the user's current session state
			sessions[sessionId].context = context;
        })
        .catch((err) => {
			console.error('Oops! Got an error from Wit: ', err.stack || err);
        })
	}
});

// Message handler for Facebook Messenger
app.post('/webhook', (req, res) => {
  // Parse the Messenger payload
  // See the Webhook reference
  // https://developers.facebook.com/docs/messenger-platform/webhook-reference
  const data = req.body;
	console.log("GOT SOMETHING!!!!!!");
	//const info = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;
	//console.log("FB ip address: " + info);

  if (data.object === 'page') {
    data.entry.forEach(entry => {
      entry.messaging.forEach(event => {
        if (event.message) {
          // Yay! We got a new message!
          // We retrieve the Facebook user ID of the sender
          const sender = event.sender.id;
		  //308115649579044 -  should not take results from this fbid because it's us.
		  if(sender == "883952921740002"){
		      console.log("got request from self!!!!!");
		      //res.sendStatus(200);
		      return;
		  }
          // We retrieve the user's current session, or create one if it doesn't exist
          // This is needed for our bot to figure out the conversation history
          const sessionId = findOrCreateSession(sender);

          // We retrieve the message content
          const {text, attachments} = event.message;

          if (attachments) {
            // We received an attachment
            // Let's reply with an automatic message
            fbMessage(sender, 'Sorry I can only process text messages for now.')
            .catch(console.error);
          } else if (text) {
            // We received a text message

            // Let's forward the message to the Wit.ai Bot Engine
            // This will run all actions until our bot has nothing left to do
            wit.runActions(
              sessionId, // the user's current session
              text, // the user's message
              sessions[sessionId].context // the user's current session state
            ).then((context) => {
              // Our bot did everything it has to do.
              // Now it's waiting for further messages to proceed.
              console.log('Waiting for next user messages');

              // Based on the session state, you might want to reset the session.
              // This depends heavily on the business logic of your bot.
              // Example:
              // if (context['done']) {
              //   delete sessions[sessionId];
              // }


              //Our logic is: if we have had success, failure, a final item, or we updated cart...
			           //reset the context
			              console.log("Test")
              console.log("Context: " + JSON.stringify(context));
			        if(context.complete){
				            context = {};
			        }
              // Updating the user's current session state
              sessions[sessionId].context = context;
            })
            .catch((err) => {
              console.error('Oops! Got an error from Wit: ', err.stack || err);
            })
          }
        } else {
          console.log('received event', JSON.stringify(event));
          //this is where you handle the call for postback need to also make sure that when facebook pings you, you still respond with 200.
          var test = event.postback;

          //console.log("test is: " + test);
          if(event.postback){

		  }
        }
      });
    });
  }
  res.sendStatus(200);
});

/*
 * Verify that the callback came from Facebook. Using the App Secret from
 * the App Dashboard, we can verify the signature that is sent with each
 * callback in the x-hub-signature field, located in the header.
 *
 * https://developers.facebook.com/docs/graph-api/webhooks#setup
 *
 */
function verifyRequestSignature(req, res, buf) {
  var signature = req.headers["x-hub-signature"];
	console.log("Checking Security -----------------");
  if (!signature) {
    // For testing, let's log an error. In production, you should throw an
    // error.
    console.error("Couldn't validate the signature.");
  } else {
    var elements = signature.split('=');
    var method = elements[0];
    var signatureHash = elements[1];

    var expectedHash = crypto.createHmac('sha1', FB_APP_SECRET)
                        .update(buf)
                        .digest('hex');

    if (signatureHash != expectedHash) {
      throw new Error("Couldn't validate the request signature.");
    }
  }
}

//app.listen(PORT);
//console.log('Listening on :' + PORT + '...');

//create server and put on port 443...
var fs = require('fs');

var options = {
	key: fs.readFileSync('privkey.pem'),
	cert: fs.readFileSync('cert.pem')
};
//http.createServer(app).listen(80);
https.createServer(options, app).listen(443);
console.log('Listening on port: ' + 443 + '...');
