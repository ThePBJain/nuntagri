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
function sendGenericMessage(sessionId) {
	console.log("Made it in GenericMessage");
	const recipientId = sessions[sessionId].fbid;
	var list = sessions[sessionId].list[0].Model;
	//console.log(JSON.stringify(list));
	
	//for loop for parsing through each item in list and getting the name, subtitle, item url, image url, etc...
	//then you have to somehow put it in a json which then goes where elements is now...
	var element = [];
	for(var i=0; i<list.length; i++){
		var counter = list[i];
		var unit = {
			title: counter.name,
            subtitle: counter.subtitle,
            item_url: counter.itemUrl,            
            image_url: counter.imageUrl,
            buttons: [{
              type: "web_url",
              url: counter.itemUrl,
              title: "Buy Now"
            }, {
              type: "postback",
              title: "Add to Cart",
              payload: JSON.stringify(counter), //should be counter.upc
            }]
		}
		element.push(unit);
	}
	
	//the Final JSON
   var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: element
        }
      }
    }
  }; 
  //if recipient is Voicebox, dont send message...
	if(recipientId != "308115649579045"){
		callSendAPI(messageData);
	}
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
		numItems: 0,
		message: null,
		type: null,
		list: null,
		cart: []
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
const search = (list, sessionId, type, parameter, brand, color) => {
	if(type && list.length != 1){
		//fix this!!!
		console.log("in here: " + JSON.stringify(list));
		//could add a session.list over here to save the list
		list = jsonQuery('[*].name', {
			data: list,
			allowRegexp: true
		}).value
		return list;
	}else{
		if(!sessions[sessionId].type){
			sessions[sessionId].type = list[0].name;
		}
		//console.log(JSON.stringify(list));
		if(parameter != null || brand != null){
			//run if we have parameter, else just keep as is...
			list = jsonQuery('Model[* name~/'+parameter+'/i | brand~/'+brand+'/i]', {
				data: list,
				allowRegexp: true
			}).value;
			//set up a flag to note that we have no "Model" and need a different regex
			var temp = [{"Model": list}];
			//console.log("hey budddy: " + JSON.stringify(temp));
			sessions[sessionId].list = temp;
	    }else{
			//run to formatt correctly if null
			sessions[sessionId].list = list;
			list = jsonQuery('Model[*]', {
				data: list,
				allowRegexp: true
			}).value;
		}
	  
	  //write here a design that if the list is empty because of parameter, it will send a response saying "there is no item with that parameter"
	  
	  //fix color so that it doesn't fuck up
	  if(color != null){
		  console.log("checking color: " + list);
		  var nameList = [];
		  for(var i=0; i<list.length; i++){
			console.log(list[i]);
			var counter = list[i];
			for(var j=0; j<counter.colors.length; j++){
				if(counter.colors[j] === color){
					console.log("In here");
					nameList.push(counter.name);
					break;
				}
			}
		  }
		  list = nameList;
		}else{
			//sessions[sessionId].list = list;
			list = jsonQuery('[*].name', {
				data: list,
				allowRegexp: true
		    }).value
		}
		
		return list;
		
	}
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
  updateCart({sessionId, context, entities}) {
	  //used only for demo to find cart that addToCart method will send it too.
    return new Promise(function(resolve, reject) {
      var intent = firstEntityValue(entities, 'intent')
      console.log("Intent: " + intent + "\nCart #: " + CART);
      if (intent == 'update') {
		CART++;
        context.number = CART;
        sessions[sessionId].numItems = sessions[sessionId].cart.length;
      } else {
        context.number = 9999;
      }
      console.log("\nCart #: " + CART);
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
  var fs = require('fs');
  var obj = JSON.parse(fs.readFileSync('catalog.json', 'utf8'));
  console.log("\n\n Test: " + obj.Category[0].name);
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
		  if(sender == "308115649579044"){
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
