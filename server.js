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
require('dotenv').load();
const bodyParser = require('body-parser');
const crypto = require('crypto');
const express = require('express');
const fetch = require('node-fetch');
const request = require('request');
var jsonQuery = require('json-query');
var schedule = require('node-schedule');
var dateFormat = require('dateformat');
var http = require('http');
var https = require('https');
var fs = require('fs');

//email sending related
var helper = require('sendgrid').mail;
var sg = require('sendgrid')(process.env.SENDGRID_API_KEY);

//twilio specific
var twilio = require('twilio');
const MessagingResponse = require('twilio').twiml.MessagingResponse;
var accountSid = process.env.TWILIO_ACCOUNT_SID; // Your Account SID from www.twilio.com/console
var authToken = process.env.TWILIO_AUTHTOKEN;   // Your Auth Token from www.twilio.com/console
console.log("TWILIO TEST: " + accountSid + "\n" + authToken);
var client = new twilio(accountSid, authToken);

//payment processing
var stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
var numJunkLeadsSent = 0;
var numJunkInvoices = 1;

//geocoder using OpenStreetMap
var NodeGeocoder = require('node-geocoder');
var options = {
  provider: 'openstreetmap',

  // Optional depending on the providers
  httpAdapter: 'https', // Default
  email: 'pranajain@gmail.com', // dunno
  formatter: null         // 'gpx', 'string', ...
};

var geocoder = NodeGeocoder(options);

/* //GEOCODER EXAMPLE
	geocoder.geocode('Amsterdam, Noord-Holland, Netherlands')
  		.then(function(res) {
    		console.log(res);
  		})
  		.catch(function(err) {
    		console.log(err);
  		});
*/
//mongodb database setup
var mongoose = require('mongoose');

// *** config file *** //
var config = require('./_config');

// *** seed the database *** //
if (process.env.NODE_ENV === 'development') {
  var seedAdmin = require('./models/seeds/admin.js');
  var productAdmin = require('./models/seeds/product.js');
  seedAdmin();
  productAdmin();
}

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
const PORT = process.env.PORT || 443; //443
//const PORT = 443;

// Wit.ai parameters
const WIT_TOKEN = process.env.WIT_TOKEN;
const WIT_JUNK_TOKEN = process.env.WIT_JUNK_TOKEN;
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
// Dirty Dog Hauling specific code

// See Postman to understand how it works
// https://developers.facebook.com/docs/messenger-platform/send-api-reference

//collect just the main pieces of information... format the rest
			/*	order = {
					name: sessions[sessionId].name,
					items: sessions[sessionId].items,
					location: sessions[sessionId].location,
					phone: phone, +15105799664
					time: dayTime
				};*/
function sendJobToDirtyDog(order) {
	console.log("Trying to send job to DIRTY DDOG");
	console.log(order);
	const fname = order.name.split(' ').slice(0, -1).join(' ');
	const lname = order.name.split(' ').slice(-1).join(' ');
	const phone = order.phone.substring(2);
	//var d = new Date(order.time.substring(0, (order.time.length-6)));
	var d = new Date(order.time);
	console.log("Original getTime: " + d.getTime());
	var timeStamp = d.getTime()/1000;
	console.log("Date Object: " + d);
	console.log("Timestamp: " + timeStamp);
  var abbr = abbrRegion(order.location.state, "abbr");
	var options = { method: 'POST',
	  url: 'http://dirtydoghauling.com/pawtracker/process/add_job.php',
	  headers:
	   {
		 'content-type': 'application/x-www-form-urlencoded' },
	  form:
	   { fran_id: '2', //constant
		 jTime: timeStamp, //date converted to unix timecode
		 trkID: '7', //constant, may change to have for specifically text based submissions
		 jAddedBy: '69', // our user id (pranav jain)
		 cFirstName: fname, // collected by name
		 cLastName: lname, // find a way to split this up
		 cAddress: order.location.string,
		 cCity: order.location.city, //you could pull this from geocoder...
		 cState: abbr, //you could pull this from geocoder...
		 cZip: order.location.zipcode, //you could pull this from geocoder...
		 cHomeArea: phone.substring(0,3), // phone number broken up into parts
		 cHomePre: phone.substring(3,6), // phone number broken up into parts
		 cHomeSuf: phone.substring(6), // phone number broken up into parts
		 jAddress: order.location.string, //always same as cAddress
		 jCity: order.location.city, //umm... you could pull this from geocoder...
		 jState: abbr, //umm... you could pull this from geocoder...
		 jZip: order.location.zipcode, //umm... you could pull this from geocoder...
		 jJunkOther: order.items // items would go here
		 } };

		 console.log("Options: " + JSON.stringify(options));

	request(options, function (error, response, body) {
	  if (error){
      console.log("error: " + error);
    }

	  console.log("Response: " + JSON.stringify(response));
	  //look only for a 200 response code...
	});

}





// ----------------------------------------------------------------------------
// Wit.ai bot specific code

// This will contain all user sessions.
// Each session has an entry:
// sessionId -> {fbid: facebookUserId, context: sessionState, numItems: ItemsInCart, type: TypeOfItemsInList, list: jsonQueryOfItems, cart: ArrayOfItemsInPreviousCart}

//Set this up to put session as a user db table on mongodb
var User = require('./models/user');
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
    sessionId = new Date().toISOString(); //123456789
    sessions[sessionId] = {
      fbid: fbid, // phone number for sms users
      conversationTime: null,
      context: {

      },
      name: null,
      seller: null, //  {list: [{name: product, amount: load}]}
      buyer: null, // {orders:...
        deliverer: null, //
        items: null, //will be an array for junk hauling
        location: null,
        time: null,
        message: "",
        text: ""
      };
      User.findOne({ phoneID: fbid}, function(err, user){
        //console.log("Made it into here. Found user: " + user);
        if (err) {
          console.log(err);
        }
        if (!user) {
          //create new model
          console.log("Found no user");
          var newUser = new User({
            phoneID: fbid
          });
          newUser.save(function(err, user){
            if(err){
              console.log(err);
            }else{
              console.log(user);
            }
          });
          sessions[sessionId] = {
            fbid: fbid, // phone number for sms users
            conversationTime: null,
            context: {

            },
            name: null,
            seller: null, //  {list: [{name: product, amount: load}]}
            buyer: null, // {orders:...
              deliverer: null, //
              items: null, //will be an array for junk hauling
              location: null,
              time: null,
              message: "",
              text: ""
            };
          }else{
            //load old model from mongodb
            console.log("Found user");
            const type = user.userType;
            sessions[sessionId] = {
              fbid: fbid, // phone number for sms users
              conversationTime: null,
              context: {

              },
              name: user.name,
              seller: null, //  {list: [{name: product, amount: load}]}
              buyer: null, // {orders:...
                deliverer: null, //
                items: null, //will be an array for junk hauling
                location: null,
                time: null,
                message: "",
                text: ""
              };
              sessions[sessionId][type] = user.typeData;
              //DONT FORGET THIS
              user.markModified('typeData');
            }
          });
        }
        //console.log(JSON.stringify(sessions));
        return sessionId;
      };


// Method to read entities and get values if exists
const firstEntityValue = (entities, entity) => {
  const val = entities && entities[entity] &&
    Array.isArray(entities[entity]) &&
    entities[entity].length > 0 &&
    entities[entity][0];
  if (!val) {
    return null;
  }
  console.log("firstEntity: " + val);
  //return typeof val === 'object' ? val.value : val;
  return val;
};




//search method to search through the catalog.json and get items
/*
	Queue will look like this
	queue: [
		{
			start: seller location,
			name: product,
			amount: load,
			end: buyer location
		}
	]
	//dirty dog
	queue: [
		{
			name: "Pranav Jain",
			items: "a sofa",
			location: {
        				string: loc,
        				latitude: res[0].latitude,
        				longitude: res[0].longitude
        			},
			phone: "+15105799664",
			time: " Thu Jul 20, 2017 12:40pm "
		}
	]
*/
const selectDeliverers = (order, sessionId) => {
	console.log("Selecting the drivers------------------");
	//change Date object stored in order.time to proper formatting
	var orderTime = dateFormat(order.time, "dddd, mmmm dS, yyyy, h:MM:ss TT");
	order.time = orderTime;
	console.log("Order: " + JSON.stringify(order));
	var bestdeliverer = null;
	var closest = 10000;
	var bestK = null;
	Object.keys(sessions).forEach(k => {
		if (sessions[k].deliverer != null) {
			// Yep, got it!
			var deliverer = sessions[k].deliverer;
			//algo to find best driver goes here.
			if(deliverer.capacity >= 40){
				bestdeliverer = deliverer;
				bestK = k;
			}
	}

	});
	console.log("BestDeliverer: " + bestdeliverer)
	if(bestdeliverer){
		console.log("Best driver is: " + sessions[bestK])
		var isEmpty = bestdeliverer.queue < 1;

		//if it is empty start queue movement after pushing order in.
		bestdeliverer.queue.push(order);
		sessions[bestK].context.deliverer = true;
		if(isEmpty){
			//send message to deliverer & set context
			//check if bestdeliverer is facebook or text
			if(sessions[bestK].fbid.substring(0,6) == "100011"){
				//sms twilio
				var phone = "+" + (sessions[bestK].fbid).substring(6);
				var message = "Next order by user: \n" + "Name: " + bestdeliverer.queue[0].name +
														"\nItems: " + bestdeliverer.queue[0].items +
														"\nAddress: " + bestdeliverer.queue[0].location.string +
														"\nPhone Number: " + bestdeliverer.queue[0].phone +
														"\nTime: " + bestdeliverer.queue[0].time +
														"\nText \"done\" or \"complete\" when job has been finished";
				//will have to change this so can work from different phone numbers depending on who's using this
				console.log("Sending Message to deliverer");
				client.messages
					.create({
						to: phone,
						from: '+17173882677',
						body: message
					})
					.then((message) => console.log(message.sid));
			}else{
				//facebook
				var sender = sessions[bestK].fbid;
				var message = "Pick up: \n" + bestdeliverer.queue[0].amount + " kgs of " + bestdeliverer.queue[0].name +
														"\nAddress: " + bestdeliverer.queue[0].start +
														"\nContact at: " + sessions[sessionId].fbid;
				fbMessage(sender, message);
			}

		}
	}

};

//-----------------------------------------------------------------
// DateTime Helper functions
// Check if timezone is in Daylight savings time

Date.prototype.stdTimezoneOffset = function () {
    var jan = new Date(this.getFullYear(), 0, 1);
    var jul = new Date(this.getFullYear(), 6, 1);
    return Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
}

Date.prototype.isDstObserved = function () {
    return this.getTimezoneOffset() < this.stdTimezoneOffset();
}

//-----------------------------------------------------------------
// State Abbreviation conversion
// Convert full state name to the abbr version
function abbrRegion(input, to) {
    var states = [
        ['Alabama', 'AL'],
        ['Alaska', 'AK'],
        ['American Samoa', 'AS'],
        ['Arizona', 'AZ'],
        ['Arkansas', 'AR'],
        ['Armed Forces Americas', 'AA'],
        ['Armed Forces Europe', 'AE'],
        ['Armed Forces Pacific', 'AP'],
        ['California', 'CA'],
        ['Colorado', 'CO'],
        ['Connecticut', 'CT'],
        ['Delaware', 'DE'],
        ['District Of Columbia', 'DC'],
        ['Florida', 'FL'],
        ['Georgia', 'GA'],
        ['Guam', 'GU'],
        ['Hawaii', 'HI'],
        ['Idaho', 'ID'],
        ['Illinois', 'IL'],
        ['Indiana', 'IN'],
        ['Iowa', 'IA'],
        ['Kansas', 'KS'],
        ['Kentucky', 'KY'],
        ['Louisiana', 'LA'],
        ['Maine', 'ME'],
        ['Marshall Islands', 'MH'],
        ['Maryland', 'MD'],
        ['Massachusetts', 'MA'],
        ['Michigan', 'MI'],
        ['Minnesota', 'MN'],
        ['Mississippi', 'MS'],
        ['Missouri', 'MO'],
        ['Montana', 'MT'],
        ['Nebraska', 'NE'],
        ['Nevada', 'NV'],
        ['New Hampshire', 'NH'],
        ['New Jersey', 'NJ'],
        ['New Mexico', 'NM'],
        ['New York', 'NY'],
        ['North Carolina', 'NC'],
        ['North Dakota', 'ND'],
        ['Northern Mariana Islands', 'NP'],
        ['Ohio', 'OH'],
        ['Oklahoma', 'OK'],
        ['Oregon', 'OR'],
        ['Pennsylvania', 'PA'],
        ['Puerto Rico', 'PR'],
        ['Rhode Island', 'RI'],
        ['South Carolina', 'SC'],
        ['South Dakota', 'SD'],
        ['Tennessee', 'TN'],
        ['Texas', 'TX'],
        ['US Virgin Islands', 'VI'],
        ['Utah', 'UT'],
        ['Vermont', 'VT'],
        ['Virginia', 'VA'],
        ['Washington', 'WA'],
        ['West Virginia', 'WV'],
        ['Wisconsin', 'WI'],
        ['Wyoming', 'WY'],
    ];

    // So happy that Canada and the US have distinct abbreviations
    var provinces = [
        ['Alberta', 'AB'],
        ['British Columbia', 'BC'],
        ['Manitoba', 'MB'],
        ['New Brunswick', 'NB'],
        ['Newfoundland', 'NF'],
        ['Northwest Territory', 'NT'],
        ['Nova Scotia', 'NS'],
        ['Nunavut', 'NU'],
        ['Ontario', 'ON'],
        ['Prince Edward Island', 'PE'],
        ['Quebec', 'QC'],
        ['Saskatchewan', 'SK'],
        ['Yukon', 'YT'],
    ];

    var regions = states.concat(provinces);

    var i; // Reusable loop variable
    if (to == 'abbr') {
        input = input.replace(/\w\S*/g, function (txt) { return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); });
        for (i = 0; i < regions.length; i++) {
            if (regions[i][0] == input) {
                return (regions[i][1]);
            }
        }
    } else if (to == 'name') {
        input = input.toUpperCase();
        for (i = 0; i < regions.length; i++) {
            if (regions[i][1] == input) {
                return (regions[i][0]);
            }
        }
    }
}

//-----------------------------------------------------------------
// Invoice Generation and Sending
// Create new invoice and email to Dirty Dog
function generateInvoice(invoice, filename, success, error) {
	var postData = JSON.stringify(invoice);
	var options = {
		hostname  : "invoice-generator.com",
		port      : 443,
		path      : "/",
		method    : "POST",
		headers   : {
			"Content-Type": "application/json",
			"Content-Length": Buffer.byteLength(postData)
		}
	};

	var file = fs.createWriteStream(filename);

	var req = https.request(options, function(res) {
		res.on('data', function(chunk) {
			file.write(chunk);
		})
			.on('end', function() {
				file.end();

				if (typeof success === 'function') {
					success();
				}
			});
	});
	req.write(postData);
	req.end();

	if (typeof error === 'function') {
		req.on('error', error);
	}
}

/*var invoice = {
	logo: "https://scontent.fagc1-2.fna.fbcdn.net/v/t1.0-9/15056399_883978575070770_2719717534750147548_n.png?oh=663d94e87412dded7c64011442b2c12a&amp;oe=59CFF0BF",
	from: "NuntAgri\n7735 Althea Ave.\nHarrisburg, Pa 17112",
	to: "Dirty Dog Hauling",
	currency: "usd",
	number: "INV-0001",
	payment_terms: "Auto-Billed - Do Not Pay",
	items: [
		{
			name: "Subscription to NuntAgri",
			quantity: 1,
			unit_cost: 100
		}
	],
	fields: {
		tax: "%"
	},
	tax: 5,
	notes: "Thanks for being an awesome customer!",
	terms: "No need to submit payment. You will be auto-billed for this invoice."
};

generateInvoice(invoice, 'invoice.pdf', function() {

	console.log("Saved invoice to invoice.pdf");
	sendEmail("pranajain@gmail.com");
}, function(error) {
	console.error(error);
});*/
function sendEmail(userEmail){
	var mail = new helper.Mail();
	var email = new helper.Email('invoice@nuntagri.com', 'NuntAgri Billing');
	mail.setFrom(email);

	mail.setSubject('Invoice from NuntAgri');

	var personalization = new helper.Personalization();
	email = new helper.Email(userEmail);
	personalization.addTo(email);
	mail.addPersonalization(personalization);

	var content = new helper.Content('text/html', '<html><head><style type="text/css">html, body { margin: 0; padding: 0; border: 0; height: 100%; overflow: hidden;} iframe { width: 100%; height: 100%; border: 0}</style></head><body>Invoice: <iframe src="cid:139db99fdb5c3704"></iframe></body></html>');
	mail.addContent(content);

	var attachment = new helper.Attachment();
	var file = fs.readFileSync('invoice.pdf');
	var base64File = new Buffer(file).toString('base64');
	attachment.setContent(base64File);
	attachment.setType('application/pdf');
	attachment.setFilename('invoice.pdf');
	attachment.setDisposition('inline');//inline
	attachment.setContentId("139db99fdb5c3704");
	mail.addAttachment(attachment);

	var sgRequest = sg.emptyRequest({
	  	method: 'POST',
	  	path: '/v3/mail/send',
	  	body: mail.toJSON(),
	});

	sg.API(sgRequest, function(err, response) {
		  console.log(response.statusCode);
		  console.log(response.body);
		  console.log(response.headers);
	});
}


//-----------------------------------------------------------------
// Our bot actions
// Write new actions over here that will be called by Wit.ai stories
//todo: delete success and fail context markers in beginning of each attempt


function items(sessionId, context, entities) {
  var item = firstEntityValue(entities, 'item');
  console.log("Entities: " + JSON.stringify(entities));
  if(context.fail){
    delete context.fail;
  }
  console.log("Items: " + item.value);
  if(item.value){
    delete context.fail;
    sessions[sessionId].items = item.value; //may change this to include an array of items...

    context.missingAddress = true;

  }else{
    delete context.missingAddress;
    context.fail = true;
  }
  //return the resolution of the context...
}

function verifyAddress(sessionId, context, entities) {
  //used only for demo to find cart that addToCart method will send it too.
  //todo: get this function to wait to complete before returning...
    var loc = firstEntityValue(entities, 'location')
    console.log("Location understood by wit.ai: " + loc.value);
    if(loc){
      geocoder.geocode(loc.value)
      .then(function(res) {
        //console.log(res);
        if(res.length != 0){
          console.log("We found the geolocation.");
          var location = {
            string: loc.value,
            latitude: res[0].latitude,
            longitude: res[0].longitude,
            city: res[0].city,
            state: res[0].state,
            zipcode: res[0].zipcode
          }

          sessions[sessionId].location = location;

          delete context.fail;
          context.success = true;

        }else{
          //should do this but will accept for now
          //delete context.success;
          //context.fail = true;
          console.log("We failed to find location.");
          var location = {
            string: loc.value,
            latitude: 0.0,
            longitude: 0.0
          }
          sessions[sessionId].location = location;
          delete context.fail;
          context.success = true;
        }
        //sessions[sessionId].location = loc;
      }).catch(function(err) {
        console.log(err);
        delete context.success;
        context.fail = true;
      });
    }else{
      console.log("Could not identify location from wit.ai");
      delete context.success;
      context.fail = true;
    }
  }
  function checkDateTime(sessionId, context, entities) {
    //used only for demo to find cart that addToCart method will send it too.
    var dayTime = firstEntityValue(entities, 'datetime');
    if(context.fail){
      delete context.fail;
    }

    //East coast time difference
    var timezoneOff = -5;

    console.log("dateTime: " + dayTime.value);
    if(dayTime.value){
      delete context.fail;
      //window between 8 - 18
      var date = new Date(dayTime.value);
      date.setMinutes(0);
      date.setSeconds(0);

      //check to see if we're in Daylight savings time (DST)
      if (date.isDstObserved()) {
          console.log ("Daylight saving time!");
          timezoneOff++;
      }

      //to fit time windows that we have set up (2 hours each) from 8 am to 6pm
      //include timezone offset to see everything in east coast time
      if((date.getUTCHours() + timezoneOff) % 2 != 0){
        date.setUTCHours(date.getUTCHours() - 1);
      }
      //date is coming in wrong because of system time zone
      var orderTime = dateFormat(date, "dddd, mmmm dS, yyyy, h:MM:ss TT Z");

      //testing by putting date object in here so we can do other things too.
      //sessions[sessionId].time = dayTime.value;
      sessions[sessionId].time = date.toString();
      //what to display to user
      context.foundTime = orderTime;

      //check to see if time is within 2 hours and fail if it does
      //this is in hours
      console.log("This is the differential: " + (date - (new Date()))/(1000*60*60));
      console.log("This is what new Object looks like: " + date);
      if( (date-(new Date()))/(1000*60*60) < 2.0) {
        console.log("Within 2 hours!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        delete context.foundTime;
        context.fail = true;
      }else if((date.getUTCHours() + timezoneOff) < 8 || (date.getUTCHours() + timezoneOff) >= 18){
        console.log("Out of scope with windows!!!!!!");
        delete context.foundTime;
        context.fail = true;
      }
    }else{
      delete context.complete;
      context.fail = true;
    }
}
function setName(sessionId, context, entities) {
  //used only for demo to find cart that addToCart method will send it too.
    var name = firstEntityValue(entities, 'contact');
    name = sessions[sessionId].text;
    if(context.fail){
      delete context.fail;
    }
    if(name){
      var User = require('./models/user');
      User.findOne({ name: name }, function (err, user) {
        if (err){
          console.log(err);
        }else{
          if(user){
            console.log("USER FOUND!!!");
          }else{
            console.log("User not found");
          }
        }
      });
      sessions[sessionId].name = name;
      context.gotName = true;
    }else{
      context.fail = true;
    }
    console.log("name: " + name);
}
function junkOrder(sessionId, context, entities) {
  //used only for demo to find cart that addToCart method will send it too.
    var dayTime = sessions[sessionId].time;
    var orderTime = dateFormat(dayTime, "dddd, mmmm dS, yyyy, h:MM:ss TT");
    if(context.fail){
      delete context.fail;
    }
    console.log("dayTime: " + dayTime);
    console.log("orderTime: " + orderTime);
    if(dayTime && orderTime){
      delete context.fail;

      //finish order here...
      var phone = "+" + (sessions[sessionId].fbid).substring(6);
      var order = {
        name: sessions[sessionId].name,
        items: sessions[sessionId].items,
        location: sessions[sessionId].location,
        phone: phone,
        time: sessions[sessionId].time
      };
      console.log("Order: " + JSON.stringify(order));

      //add to dirty dog hauling
      sendJobToDirtyDog(order);

      //select deliverer to send it to
      selectDeliverers(order, sessionId);


      var message = "Order by user: \n" + "Name: " + sessions[sessionId].name +
                        "\nItems: " + sessions[sessionId].items +
                        "\nAddress: " + sessions[sessionId].location.string +
                        "\nPhone Number: " + phone + "\nTime: " + orderTime;

      console.log(message);

      //this is the number you are eventually sending it to: +17173154479
      //twilio numbers: +17173882677 , +16506811972
      //Brandon: +17173297650
      const rate = 5.0; //$5 per lead sent
      client.messages
        .create({
          to: '+17173154479',
          from: '+17173882677 ',
          body: message
        }).then(function(message) {
            console.log(message.sid);
            //update quote
            numJunkLeadsSent++;
            if(numJunkLeadsSent >= 20){
              const leadsCharged = numJunkLeadsSent;
              const invoiceNum = "INV-"+ numJunkInvoices;
              //generate an Invoice
              var invoice = {
            logo: "https://scontent.fsnc1-1.fna.fbcdn.net/v/t1.0-9/19875336_1034769596658333_6527658905718200604_n.png?oh=f382576eb216f096a0760676ebecb0fd&oe=59C3A944",
            from: "NuntAgri\n7735 Althea Ave.\nHarrisburg, Pa 17112",
            to: "Dirty Dog Hauling",
            currency: "usd",
            number: invoiceNum,
            payment_terms: "Auto-Billed - Do Not Pay",
            items: [
              {
                name: "Leads from NuntAgri ",
                quantity: leadsCharged,
                unit_cost: rate
              }
            ],
            notes: "You should be emailed a receipt for this shortly.",
            terms: "No need to submit payment. You will be auto-billed for this invoice."
          };
              console.log("------------------Charging Dirty Dog------------------");
              console.log("Leads: " + numJunkLeadsSent);

              //get customer and charge him
              stripe.customers.list({
                  limit: 3,
                  created: {
                    lt: "1499552052"
                  }

               },
            function(err, customers) {
              // asynchronously called
              if(err){
                console.log(err);
              }else{
                const customer = customers.data[0];
                generateInvoice(invoice, 'invoice.pdf', function() {
                console.log("Saved invoice to invoice.pdf");
                sendEmail(customer.email);
              }, function(error) {
                console.error(error);
              });
                stripe.charges.create({
                  amount: leadsCharged*rate*100,
                  currency: "usd",
                  customer: customer.id // Previously stored, then retrieved
              }, function(err, charge) {
                  // asynchronously called
                  if(err){
                    console.log(err);
                  }else{
                    numJunkLeadsSent -= leadsCharged;
                    console.log("Leads (should be 0): " + numJunkLeadsSent);
                  }
              });
            }
            });

            }

        }).catch(function(err) {
            console.error('Could not send message');
            console.error(err);
        });
      delete context.fail;
      context.complete = phone;
    }else{
      delete context.complete;
      context.fail = true;
    }
}

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
		if(recipientId.substring(0,6) == "100011"){
			sessions[sessionId].message += ("\n" + text);
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
		//used for selling
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
				console.log("Found old seller profile");
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
			//for some reason its still saying "I am unable to process your request at this time." for context.success = true

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
			console.log("Location understood by wit.ai: " + loc);
			if(loc){
			geocoder.geocode(loc)
  			.then(function(res) {
    			console.log(res);
    			if(res.length != 0){
        			var location = {
        				string: loc,
        				latitude: res[0].latitude,
        				longitude: res[0].longitude
        			}

        			sessions[sessionId].location = location;

					delete context.fail;
					context.success = true;

    			}else{
    				//should do this but will accept for now
    				//delete context.success;
					//context.fail = true;
					var location = {
        				string: loc,
        				latitude: 0.0,
        				longitude: 0.0
        			}
        			sessions[sessionId].location = location;
        			delete context.fail;
					context.success = true;
    			}
    			//sessions[sessionId].location = loc;
    			return resolve(context);
  			}).catch(function(err) {
    			console.log(err);
    			delete context.success;
				context.fail = true;
				return resolve(context);
  			});
			}else{
				console.log("Could not identify location from wit.ai");
				delete context.success;
				context.fail = true;
				return resolve(context);
			}
		});
	},
	complete({sessionId, context, entities}) {
		//used only for demo to find cart that addToCart method will send it too.
		return new Promise(function(resolve, reject) {
			var statement = firstEntityValue(entities, 'affirmation')
			var deliverer = sessions[sessionId].deliverer
			//for incomplete, not done, etc...
			if(statement){
				if(statement.includes("in") || statement.includes("not")){

							/*
								//dirty dog
								queue: [
									{
										name: "Pranav Jain",
										items: "a sofa",
										location: {
													string: loc,
													latitude: res[0].latitude,
													longitude: res[0].longitude
												},
										phone: "+15105799664",
										time: " Thu Jul 20, 2017 12:40pm "
									}
								]
								var order = {
												name: sessions[sessionId].name,
												items: sessions[sessionId].items,
												location: sessions[sessionId].location,
												phone: phone,
												time: dayTime
											}

					*/
					//same as below but with statement sent to leland saying order cancelled
				}else if(deliverer && (statement.includes("done") || statement.includes("complete"))){ // for when task has been completed by driver
					var message = "";
					//get rid of old order
					deliverer.queue.splice(0, 1);
					if( deliverer.queue[0]){
						var order = deliverer.queue[0];
						message = "Next order by user: \n" + "Name: " + order.name +
														"\nItems: " + order.items +
														"\nAddress: " + order.location.string +
														"\nPhone Number: " + order.phone +
														"\nTime: " + order.time +
														"\nText \"done\" or \"complete\" when job has been finished";
					}else{
						message = "Your job queue is currently empty. You can either wait for another job or call it a day! ";
					}

					//driver's phone
					var phone = "+" + (sessions[sessionId].fbid).substring(6);

					//send message to driver with order or "empty job queue" message.
					client.messages
					.create({
						to: phone,
						from: '+17173882677 ',
						body: message
					}).then(function(message) {
						console.log(message.sid);
					}).catch(function(err) {
						console.error('Could not send message');
						console.error(err);
					});
				}
			}

			context.complete = true;
			return resolve(context);
		});
	},
	items({sessionId, context, entities}) {
		//used only for demo to find cart that addToCart method will send it too.
		return new Promise(function(resolve, reject) {
			var items = firstEntityValue(entities, 'item');
			console.log("Entities: " + JSON.stringify(entities));
			if(context.fail){
				delete context.fail;
			}
			console.log("Items: " + items);
			if(items){
				delete context.fail;
				sessions[sessionId].items = items;

				context.missingAddress = true;

			}else{
				delete context.missingAddress;
				context.fail = true;
			}
			return resolve(context);
		});
	},
	junkOrder({sessionId, context, entities}) {
		//used only for demo to find cart that addToCart method will send it too.
		return new Promise(function(resolve, reject) {
			var dayTime = sessions[sessionId].time;
			var orderTime = dateFormat(dayTime, "dddd, mmmm dS, yyyy, h:MM:ss TT");
			if(context.fail){
				delete context.fail;
			}
			console.log("dayTime: " + dayTime);
			console.log("orderTime: " + orderTime);
			if(dayTime && orderTime){
				delete context.fail;

				//finish order here...
				var phone = "+" + (sessions[sessionId].fbid).substring(6);
				var order = {
					name: sessions[sessionId].name,
					items: sessions[sessionId].items,
					location: sessions[sessionId].location,
					phone: phone,
					time: sessions[sessionId].time
				};
				console.log("Order: " + JSON.stringify(order));

				//add to dirty dog hauling
				sendJobToDirtyDog(order);

				//select deliverer to send it to
				selectDeliverers(order, sessionId);


				var message = "Order by user: \n" + "Name: " + sessions[sessionId].name +
													"\nItems: " + sessions[sessionId].items +
													"\nAddress: " + sessions[sessionId].location.string +
													"\nPhone Number: " + phone + "\nTime: " + orderTime;

				console.log(message);

				//this is the number you are eventually sending it to: +17173154479
				//twilio numbers: +17173882677 , +16506811972
				//Brandon: +17173297650
				const rate = 5.0; //$5 per lead sent
				client.messages
  				.create({
    				to: '+17173154479',
    				from: '+17173882677 ',
    				body: message
  				}).then(function(message) {
      				console.log(message.sid);
      				//update quote
      				numJunkLeadsSent++;
      				if(numJunkLeadsSent >= 20){
      					const leadsCharged = numJunkLeadsSent;
      					const invoiceNum = "INV-"+ numJunkInvoices;
      					//generate an Invoice
      					var invoice = {
							logo: "https://scontent.fsnc1-1.fna.fbcdn.net/v/t1.0-9/19875336_1034769596658333_6527658905718200604_n.png?oh=f382576eb216f096a0760676ebecb0fd&oe=59C3A944",
							from: "NuntAgri\n7735 Althea Ave.\nHarrisburg, Pa 17112",
							to: "Dirty Dog Hauling",
							currency: "usd",
							number: invoiceNum,
							payment_terms: "Auto-Billed - Do Not Pay",
							items: [
								{
									name: "Leads from NuntAgri ",
									quantity: leadsCharged,
									unit_cost: rate
								}
							],
							notes: "You should be emailed a receipt for this shortly.",
							terms: "No need to submit payment. You will be auto-billed for this invoice."
						};
      					console.log("------------------Charging Dirty Dog------------------");
      					console.log("Leads: " + numJunkLeadsSent);

      					//get customer and charge him
      					stripe.customers.list({
      							limit: 3,
      							created: {
      								lt: "1499552052"
      							}

  							 },
  						function(err, customers) {
    						// asynchronously called
    						if(err){
    							console.log(err);
    						}else{
    							const customer = customers.data[0];
    							generateInvoice(invoice, 'invoice.pdf', function() {
									console.log("Saved invoice to invoice.pdf");
									sendEmail(customer.email);
								}, function(error) {
									console.error(error);
								});
    							stripe.charges.create({
  									amount: leadsCharged*rate*100,
  									currency: "usd",
  									customer: customer.id // Previously stored, then retrieved
								}, function(err, charge) {
  									// asynchronously called
  									if(err){
  										console.log(err);
  									}else{
  										numJunkLeadsSent -= leadsCharged;
  										console.log("Leads (should be 0): " + numJunkLeadsSent);
  									}
								});
							}
  						});

      				}

    			}).catch(function(err) {
      				console.error('Could not send message');
      				console.error(err);
   				});
				delete context.fail;
				context.complete = phone;
			}else{
				delete context.complete;
				context.fail = true;
			}
			return resolve(context);
		});
	},
	checkDateTime({sessionId, context, entities}) {
		//used only for demo to find cart that addToCart method will send it too.
		return new Promise(function(resolve, reject) {
			var dayTime = firstEntityValue(entities, 'datetime');
			if(context.fail){
				delete context.fail;
			}
			console.log("dateTime: " + dayTime);
			if(dayTime){
				delete context.fail;
				//window between 8 - 18
				var date = new Date(dayTime);
				date.setMinutes(0);
				date.setSeconds(0);
				//to fit time windows that we have set up (2 hours each) from 8 am to 6pm
				if(date.getHours() % 2 != 0){
					date.setHours(date.getHours() - 1);
				}
				//date is coming in wrong because of system time zone
				var orderTime = dateFormat(date, "dddd, mmmm dS, yyyy, h:MM:ss TT");

				//testing by putting date object in here so we can do other things too.
				sessions[sessionId].time = dayTime;
				//what to display to user
				context.foundTime = orderTime;

				//check to see if time is within 2 hours and fail if it does
				//this is in hours
				console.log("This is the differential: " + (date - (new Date()))/(1000*60*60));
				console.log("This is what new Object looks like: " + date);
				if( (date-(new Date()))/(1000*60*60) < 2.0) {
					console.log("Within 2 hours!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
					delete context.foundTime;
					context.fail = true;
				}else if(date.getHours() < 8 || date.getHours() >= 18){
					console.log("Out of scope with windows!!!!!!");
					delete context.foundTime;
					context.fail = true;
				}
			}else{
				delete context.complete;
				context.fail = true;
			}
			return resolve(context);
		});
	},
	setName({sessionId, context, entities}) {
	  //used only for demo to find cart that addToCart method will send it too.
    return new Promise(function(resolve, reject) {
			var name = firstEntityValue(entities, 'contact');
			name = sessions[sessionId].text;
			if(context.fail){
				delete context.fail;
			}
			if(name){
				var User = require('./models/user');
				User.findOne({ email: name }, function (err, user) {
					if (err){
						console.log(err);
					}else{
						if(user){
							console.log("USER FOUND!!!");
						}else{
							console.log("User not found");
						}
					}
				});
				sessions[sessionId].name = name;
				context.gotName = true;
			}else{
				context.fail = true;
			}
			console.log("name: " + name);
      return resolve(context);
    });
  },
  checkPreviousUser({sessionId, context, entities}) {
	  //used only for demo to find cart that addToCart method will send it too.
    return new Promise(function(resolve, reject) {
			if(context.fail){
				delete context.fail;
			}
			if(sessions[sessionId].name){
				context.exists = true;
			}else{
				context.doesntExist = true;
			}
			//console.log("name: " + name);
      return resolve(context);
    });
  },
	delivererJob({sessionId, context, entities}) {
		//todo: finish writing this so it works and understands which leg it's on (to seller or to buyer)
		//todo: set up verify function to verify by driver and buyer that item has been delivered...
		return new Promise(function(resolve, reject) {
			//var dayTime = firstEntityValue(entities, 'datetime');
			var dayTime = true //this doesn't need to be here, whatever entities we need will be in place here instead.e
			if(context.fail){
				delete context.fail;
			}
			console.log("dateTime: " + dayTime);
			if(dayTime){//change this depending on what entities we will need
				delete context.fail;
				//finish order here... do fbmessage or sms depending on their fbid "100011"
				//fbMessage(sender, 'Added item to cart #' + CART);
				var phone = "+" + (sessions[sessionId].fbid).substring(6);
				var message = "Order by user: \n" + "Items: " + sessions[sessionId].items +
													"\nAddress: " + sessions[sessionId].location.string +
													"\nPhone Number: " + phone + "\nTime: " + dayTime;

				console.log(message);
				//this is the number you are eventually sending it to: +17176483389
				client.messages
  				.create({
    				to: '+17173297650',
    				from: '+16506811972',
    				body: message
  				})
  				.then((message) => console.log(message.sid));
				delete context.fail;
				context.success = sessions[sessionId].location;
			}else{
				delete context.success;
				context.fail = true;
			}
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
			capacity: 50,
			queue: [],
			range: 50,
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
				//delete context.success;
				//context.fail = true;
				delete context.fail;
				context.success = true;
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

//setting up Junk Bot
const witJunk = new Wit({
  accessToken: WIT_JUNK_TOKEN,
  actions,
  logger: new log.Logger(log.INFO)
});



// Starting our webserver and putting it all together
const app = express();

// *** mongo *** //
app.set('dbUrl', config.mongoURI[process.env.NODE_ENV]);
mongoose.connect(app.get('dbUrl'));


app.use(({method, url}, rsp, next) => {
  rsp.on('finish', () => {
    console.log(`${rsp.statusCode} ${method} ${url}`);
  });
  next();
});
app.use(bodyParser.json({ verify: verifyRequestSignature }));
app.use(bodyParser.urlencoded({ extended: false }));

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
	//redirect to website test
  //res.redirect('http://nuntagri.com');
  res.send("Hi PJ");
});

//message handler for twilio
// post isn't working because of bodyParser is going to verify with below function & gets rid of body...
//find a way to fix that so we dont have this issue.
app.get('/twilio', function (req, res) {
	var text = req.query.Body; //message from twilio to send to Wit.
	const twimlResp = new MessagingResponse();
	//console.log(req);
	console.log("\n\n Test: " + text);
	//console.log("\n Query:" + JSON.stringify(req.query));
	if (req.body.Body == 'hello') {
    	console.log("WE OUT HERE WINNING!!!!");
  	}
	// We retrieve the user's current session, or create one if it doesn't exist
	// This is needed for our bot to figure out the conversation history
	//figure out how to fix sender to be twilio only
	var sender = req.query.From;
			// binary for #
	sender = "100011" + sender.substring(1);
	console.log("Sender: " + sender);
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
			res.end(twimlResp.toString());
			sessions[sessionId].message = "";
			// Based on the session state, you might want to reset the session.
			// This depends heavily on the business logic of your bot.
			// Example:
			// if (context['done']) {
			//   delete sessions[sessionId];
			// }

			//Our logic is: if we have had success, failure, a final item, or we updated cart...
			//reset the context
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
	}else{
			console.log('Failed to read text from twilio!!!');
			res.writeHead(200, {'Content-Type': 'text/xml'});
			twimlResp.message("Could not read your text.");
			res.end(twimlResp.toString());
	}
});

//message handler for twilio
// post isn't working because of bodyParser is going to verify with below function & gets rid of body...
//find a way to fix that so we dont have this issue.
app.post('/testing', function (req, res) {
  var text = req.body.Body; //message from twilio to send to Wit.
	const twimlResp = new MessagingResponse();
	//console.log(req);
	console.log("\n\n Test: " + text);
	//console.log("\n Query:" + JSON.stringify(req.query));
	// We retrieve the user's current session, or create one if it doesn't exist
	// This is needed for our bot to figure out the conversation history
	//figure out how to fix sender to be twilio only
	var sender = req.body.From;
			// binary for #
	sender = "100011" + sender.substring(1);
	console.log("Sender: " + sender);
	var sessionId = findOrCreateSession(sender);
  console.log("0. Sessions looks like: " + JSON.stringify(sessions));
	//check to reset context
	//if conversationTime == null
	if(!sessions[sessionId].conversationTime){
		console.log("Found no time");
		//new conversation
		sessions[sessionId].context = {};
		//set time
		sessions[sessionId].conversationTime = new Date();
	}else if( ((new Date()) - sessions[sessionId].conversationTime)/60000 > 10.0){
		//new conversation if 10 minutes has elapsed
		console.log("Found that 10 minutes elapsed");
		//testing deleting the entire session...
		var temp = sessions[sessionId];
		delete sessions[sessionId];
		sessionId = findOrCreateSession(sender);
		sessions[sessionId] = temp;
		sessions[sessionId].context = {};
		//set time
		sessions[sessionId].conversationTime = new Date();
	}
	console.log("The time displacement is: " + ((new Date()) - sessions[sessionId].conversationTime)/60000
	 			+ "\nContext: " + JSON.stringify(sessions[sessionId].context));
	sessions[sessionId].text = text;



	if(text){
		// We received a text message
        //todo: setup promises so that everything is synchronous
        // Let's forward the message to the Wit.ai Bot Engine
        // This will run all actions until our bot has nothing left to do
        return witJunk.message(text).then(({entities}) => {
          const intent = firstEntityValue(entities, 'intent');
          const greeting = firstEntityValue(entities, 'greetings');
          const junkGreeting = firstEntityValue(entities, 'junkGreeting');
          const quote = firstEntityValue(entities, 'quote');
          const item = firstEntityValue(entities, 'item');
          const polarAns = firstEntityValue(entities, 'polarAns');
          const dateTime = firstEntityValue(entities, 'datetime');
          const contact = firstEntityValue(entities, 'contact');
          const location = firstEntityValue(entities, 'location');
          var context = sessions[sessionId].context;
          const recipientId = sessions[sessionId].fbid;
          console.log("Entities: " + JSON.stringify(entities));
          if(item && item.confidence > 0.5){
            items(sessionId, context, entities);
            console.log("Great!  Please provide the property address with your zip code.");
            if(recipientId.substring(0,6) == "100011"){
              sessions[sessionId].message += ("\n" + "Great!  Please provide the property address with your zip code.");
            }
          }else if(location){
            //todo: setup so that could pull location data from database and offer that instead
            //if location was found, make sure that location entity contains the house numbers
            var index = text.indexOf(location.value);
            var n = text.lastIndexOf(" ", index-2);
            //if -1 then put 0 to start at beginning anyways
            n = n<0 ? 0 : n;
            var str = text.substring(n, index + location.value.length);
            //make sure to tighten scope so only takes numbers right before... not "I live at ..."
            entities.location[0].value = str;
            verifyAddress(sessionId, context, entities);
            console.log("Ok, what date and time would you like service.");
            if(recipientId.substring(0,6) == "100011"){
              sessions[sessionId].message += ("\n" + "Ok, what date and time would you like service.");
            }
          }else if(dateTime){
            checkDateTime(sessionId, context, entities);
            console.log("Would a two hour window starting at this time work for you? (yes/no only):");
            console.log(context.foundTime);
            if(recipientId.substring(0,6) == "100011"){
              if(context.fail == true){
                sessions[sessionId].message += ("\n" + "We cannot accomodate that time. What other day & time would work?");
              }else{
                sessions[sessionId].message += ("\n" + "Would a two hour window starting at this time work for you? (yes/no only):"
                                                   + context.foundTime);
              }
            }

          }else if(polarAns && polarAns.value == "No"){

            if(recipientId.substring(0,6) == "100011"){
              sessions[sessionId].message += ("\n" + "Ok, what date and time would you like service.");
            }
          }else if(polarAns && polarAns.value == "Yes"){
            if(sessions[sessionId].name && sessions[sessionId].name != ""){
              junkOrder(sessionId, context, entities);
              console.log("You are confirmed.  We will call you at this number (" +req.body.From+  "), 30 minutes before we arrive. If you have any questions, call 717-232-4009.  We will see you soon.");
              if(recipientId.substring(0,6) == "100011"){
                sessions[sessionId].message += ("\n" + "You are confirmed.  We will call you at this number (" +req.body.From+  "), 30 minutes before we arrive. If you have any questions, call 717-232-4009.  We will see you soon.");
              }
            }else{
              if(recipientId.substring(0,6) == "100011"){
                sessions[sessionId].message += ("\n" + "What name should we use for this appointment?");
              }
            }
          }else if(contact && contact.confidence > 0.6){
            setName(sessionId, context, entities);
            junkOrder(sessionId, context, entities);
            console.log("You are confirmed.  We will call you at this number (" +req.body.From+  "), 30 minutes before we arrive. If you have any questions, call 717-232-4009.  We will see you soon.");
            if(recipientId.substring(0,6) == "100011"){
              sessions[sessionId].message += ("\n" + "You are confirmed.  We will call you at this number (" +req.body.From+  "), 30 minutes before we arrive. If you have any questions, call 717-232-4009.  We will see you soon.");
            }
          }else if((greeting || junkGreeting) && !polarAns){
            console.log("Hi. Welcome to Dirty Dog Hauling Text 2 Schedule, powered by NuntAgri. What items would like hauled today?");
            if(recipientId.substring(0,6) == "100011"){
              sessions[sessionId].message += ("\n" + "Hi. Welcome to Dirty Dog Hauling Text 2 Schedule, powered by NuntAgri. What items would like hauled today?");
            }
          }else{
            console.log("Something went wrong.")
          }

          console.log('Waiting for next user messages');
    			res.writeHead(200, {'Content-Type': 'text/xml'});
    			twimlResp.message(sessions[sessionId].message);
    			res.end(twimlResp.toString());
    			sessions[sessionId].message = "";



          // Based on the session state, you might want to reset the session.
    			// This depends heavily on the business logic of your bot.
    			// Example:
    			// if (context['done']) {
    			//   delete sessions[sessionId];
    			// }

    			//Our logic is: if we have had success, failure, a final item, or we updated cart...
    			//reset the context
          console.log("Context: " + JSON.stringify(context));
    			if(context.complete){
    				context = {};
    				//remove time
    				sessions[sessionId].conversationTime = null;
    				//deleting the entire session...
    				var temp = sessions[sessionId];
    				User.update( {phoneID: sessions[sessionId].fbid}, {
    					name: sessions[sessionId].name, address: sessions[sessionId].location.string
    				}, function(err, numberAffected, rawResponse) {
       					//handle it
       					if(err){
       						console.log("err: " + err);
       					}else{
       						console.log("Response to updating user: " + rawResponse);
       					}
    				});

    				delete sessions[sessionId];
    			}else{
    				// Updating the user's current session state
    				sessions[sessionId].context = context;
    				sessions[sessionId].text = "";
    			}
        });
  }else{
			console.log('Failed to read text from twilio!!!');
			res.writeHead(200, {'Content-Type': 'text/xml'});
			twimlResp.message("Could not read your text.");
			res.end(twimlResp.toString());
	}

});

//message handler for twilio
// post isn't working because of bodyParser is going to verify with below function & gets rid of body...
//find a way to fix that so we dont have this issue.
app.get('/junkTwilio', function (req, res) {
	var text = req.query.Body; //message from twilio to send to Wit.
	const twimlResp = new MessagingResponse();
	//console.log(req);
	console.log("\n\n Test: " + text);
	//console.log("\n Query:" + JSON.stringify(req.query));
	// We retrieve the user's current session, or create one if it doesn't exist
	// This is needed for our bot to figure out the conversation history
	//figure out how to fix sender to be twilio only
	var sender = req.query.From;
			// binary for #
	sender = "100011" + sender.substring(1);
	console.log("Sender: " + sender);
	var sessionId = findOrCreateSession(sender);
	console.log("0. Sessions looks like: " + JSON.stringify(sessions));
	//check to reset context
	//if conversationTime == null
	if(!sessions[sessionId].conversationTime){
		console.log("Found no time");
		//new conversation
		sessions[sessionId].context = {};
		//set time
		sessions[sessionId].conversationTime = new Date();
	}else if( ((new Date()) - sessions[sessionId].conversationTime)/60000 > 10.0){
		//new conversation if 10 minutes has elapsed
		console.log("Found that 10 minutes elapsed");
		//testing deleting the entire session...
		var temp = sessions[sessionId];
		console.log("1. Sessions looks like: " + JSON.stringify(sessions) + "\nThis person looks like: " + JSON.stringify(temp));
		delete sessions[sessionId];
		sessionId = findOrCreateSession(sender);
		sessions[sessionId] = temp;
		sessions[sessionId].context = {};
		console.log("4. Sessions looks like: " + JSON.stringify(sessions));
		//set time
		sessions[sessionId].conversationTime = new Date();
	}
	console.log("The time displacement is: " + ((new Date()) - sessions[sessionId].conversationTime)/60000
	 			+ "\nContext: " + JSON.stringify(sessions[sessionId].context));
	sessions[sessionId].text = text;
	if(text){
		// We received a text message

        // Let's forward the message to the Wit.ai Bot Engine
        // This will run all actions until our bot has nothing left to do
        witJunk.runActions(
			sessionId, // the user's current session
			text, // the user's message
			sessions[sessionId].context // the user's current session state
        ).then((context) => {
			// Our bot did everything it has to do.
			// Now it's waiting for further messages to proceed.
			console.log('Waiting for next user messages');
			res.writeHead(200, {'Content-Type': 'text/xml'});
			twimlResp.message(sessions[sessionId].message);
			res.end(twimlResp.toString());
			sessions[sessionId].message = "";
			// Based on the session state, you might want to reset the session.
			// This depends heavily on the business logic of your bot.
			// Example:
			// if (context['done']) {
			//   delete sessions[sessionId];
			// }

			//Our logic is: if we have had success, failure, a final item, or we updated cart...
			//reset the context
			console.log("Context: " + JSON.stringify(context));
			if(context.complete){
				context = {};
				//remove time
				sessions[sessionId].conversationTime = null;
				//deleting the entire session...
				var temp = sessions[sessionId];
				User.update( {phoneID: sessions[sessionId].fbid}, {
					name: sessions[sessionId].name
				}, function(err, numberAffected, rawResponse) {
   					//handle it
   					if(err){
   						console.log("err: " + err);
   					}else{
   						console.log("Response to updating user: " + rawResponse);
   					}
				});

				delete sessions[sessionId];
			}else{
				// Updating the user's current session state
				sessions[sessionId].context = context;
				sessions[sessionId].text = "";
			}
        })
        .catch((err) => {
			console.error('Oops! Got an error from Wit: ', err.stack || err);
        })
	}else{
			console.log('Failed to read text from twilio!!!');
			res.writeHead(200, {'Content-Type': 'text/xml'});
			twimlResp.message("Could not read your text.");
			res.end(twimlResp.toString());
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
    console.log("We are checking security in here");
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
console.log("Trying port: " + PORT);
if(PORT == 443){
	var options = {
		key: fs.readFileSync('privkey.pem'),
		cert: fs.readFileSync('cert.pem')
	};
	//for starting prod server on ssl
	https.createServer(options, app).listen(443);
}else{
	//for dev testing server
	http.createServer(app).listen(PORT);
}
console.log('Listening on port: ' + PORT + '...');
module.exports = app;
