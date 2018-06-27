var chai = require('chai');
var chaiHttp = require('chai-http');
var assert = require('chai').assert;
var server = require('../server');
var expect  = require('chai').expect;
var parseString = require('xml2js').parseString;
var User = require('../models/user');
//abbrRegion, generateInvoice, sendEmail, app
//load the plugins
chai.use(chaiHttp);


describe('Testing Normal 1', function() {
  before(function(done){
    User.remove({phoneID: '10001115105555421'}, function(){
      done();
    });
  });
  it('Root Endpoint check', function(done) {
    chai.request(server.app)
    .get('/')
    .end(function(err, res){
      expect(res).to.have.status(200);
      done();
    });
  });
  it('/junkTwilio endpoint check', function(done){
    chai.request(server.app)
    .post('/junkTwilio')
    .send({'Body': 'JUNK', 'From': '+15105555421'})
    .end(function(err, res){
      expect(res).to.have.status(200);
      //console.log(res.text);
      parseString(res.text, function (err, result) {
        expect(result.Response.Message[0]).to.equal("\nHi. Welcome to Dirty Dog Hauling Text 2 Schedule, powered by NuntAgri. What items would like hauled today?");
        done();
      });
    });
  });
  it('Normal items "A sofa"', function(done){
    chai.request(server.app)
    .post('/junkTwilio')
    .send({'Body': 'A sofa', 'From': '+15105555421'})
    .end(function(err, res){
      expect(res).to.have.status(200);
      parseString(res.text, function (err, result) {
        expect(result.Response.Message[0]).to.equal("\nGreat!  Please provide the property address with your zip code.");
        done();
      });
    });
  });
  it('Normal location "246 Saint Phillip Ct. Fremont, CA"', function(done){
    chai.request(server.app)
    .post('/junkTwilio')
    .send({'Body': '246 Saint Phillip Ct. Fremont, CA', 'From': '+15105555421'})
    .end(function(err, res){
      expect(res).to.have.status(200);
      parseString(res.text, function (err, result) {
        expect(result.Response.Message[0]).to.equal("\nOk, what date and time would you like service.");
        done();
      });
    });
  });
  it('Normal dateTime "2pm"', function(done){
    chai.request(server.app)
    .post('/junkTwilio')
    .send({'Body': 'next thursday at 2pm', 'From': '+15105555421'})
    .end(function(err, res){
      expect(res).to.have.status(200);
      console.log(res.text);
      parseString(res.text, function (err, result) {
        console.dir(result);
        expect(result.Response.Message[0]).to.have.string("\nWould a two hour window starting at this time work for you? (yes/no only):");
        done();
      });
    });
  });
  it('Normal polarAns "Yes"', function(done){
    chai.request(server.app)
    .post('/junkTwilio')
    .send({'Body': 'Yes', 'From': '+15105555421'})
    .end(function(err, res){
      expect(res).to.have.status(200);
      parseString(res.text, function (err, result) {
        expect(result.Response.Message[0]).to.equal("\nWhat name should we use for this appointment?");
        done();
      });
    });
  });
  it('Normal contact "Pranav Jain"', function(done){
    chai.request(server.app)
    .post('/junkTwilio')
    .send({'Body': 'Pranav Jain', 'From': '+15105555421'})
    .end(function(err, res){
      expect(res).to.have.status(200);
      console.log(res.text);
      parseString(res.text, function (err, result) {
        console.dir(result);
        expect(result.Response.Message[0]).to.equal("\nYou are confirmed.  We will call you at this number (+15105555421), 30 minutes before we arrive. If you have any questions, call 717-232-4009.  We will see you soon.");
        done();
      });
    });
  });
});
describe('Testing Normal (remembers name) 2', function() {
  it('/junkTwilio Normal "JUNK"', function(done){
    chai.request(server.app)
    .post('/junkTwilio')
    .send({'Body': 'JUNK', 'From': '+15105555421'})
    .end(function(err, res){
      expect(res).to.have.status(200);
      //console.log(res.text);
      parseString(res.text, function (err, result) {
        expect(result.Response.Message[0]).to.equal("\nHi. Welcome to Dirty Dog Hauling Text 2 Schedule, powered by NuntAgri. What items would like hauled today?");
        done();
      });
    });
  });
  it('Normal items "A sofa and a couch"', function(done){
    chai.request(server.app)
    .post('/junkTwilio')
    .send({'Body': 'A sofa and a couch', 'From': '+15105555421'})
    .end(function(err, res){
      expect(res).to.have.status(200);
      parseString(res.text, function (err, result) {
        expect(result.Response.Message[0]).to.equal("\nGreat!  Please provide the property address with your zip code.");
        done();
      });
    });
  });
  it('Normal location "246 Saint Phillip Ct. Fremont, CA"', function(done){
    chai.request(server.app)
    .post('/junkTwilio')
    .send({'Body': '246 Saint Phillip Ct. Fremont, CA', 'From': '+15105555421'})
    .end(function(err, res){
      expect(res).to.have.status(200);
      parseString(res.text, function (err, result) {
        expect(result.Response.Message[0]).to.equal("\nOk, what date and time would you like service.");
        done();
      });
    });
  });
  it('Normal dateTime "2pm"', function(done){
    chai.request(server.app)
    .post('/junkTwilio')
    .send({'Body': 'next thursday at 2pm', 'From': '+15105555421'})
    .end(function(err, res){
      expect(res).to.have.status(200);
      console.log(res.text);
      parseString(res.text, function (err, result) {
        console.dir(result);
        expect(result.Response.Message[0]).to.have.string("\nWould a two hour window starting at this time work for you? (yes/no only):");
        done();
      });
    });
  });
  it('Normal polarAns "Yes"', function(done){
    chai.request(server.app)
    .post('/junkTwilio')
    .send({'Body': 'Yes', 'From': '+15105555421'})
    .end(function(err, res){
      expect(res).to.have.status(200);
      parseString(res.text, function (err, result) {
        expect(result.Response.Message[0]).to.equal("\nYou are confirmed.  We will call you at this number (+15105555421), 30 minutes before we arrive. If you have any questions, call 717-232-4009.  We will see you soon.");
        done();
      });
    });
  });
});

describe('Testing Multiple time changes 3', function() {
  before(function(done){
    User.remove({phoneID: '10001115105555421'}, function(){
      done();
    });
  });
  it('/junkTwilio endpoint check', function(done){
    chai.request(server.app)
    .post('/junkTwilio')
    .send({'Body': 'JUNK', 'From': '+15105555421'})
    .end(function(err, res){
      expect(res).to.have.status(200);
      //console.log(res.text);
      parseString(res.text, function (err, result) {
        expect(result.Response.Message[0]).to.equal("\nHi. Welcome to Dirty Dog Hauling Text 2 Schedule, powered by NuntAgri. What items would like hauled today?");
        done();
      });
    });
  });
  it('Normal items "a sofa, couch and tv"', function(done){
    chai.request(server.app)
    .post('/junkTwilio')
    .send({'Body': 'A sofa, couch and tv', 'From': '+15105555421'})
    .end(function(err, res){
      expect(res).to.have.status(200);
      parseString(res.text, function (err, result) {
        expect(result.Response.Message[0]).to.equal("\nGreat!  Please provide the property address with your zip code.");
        done();
      });
    });
  });
  it('Normal location 246 Saint Phillip Ct. Fremont, CA', function(done){
    chai.request(server.app)
    .post('/junkTwilio')
    .send({'Body': '246 Saint Phillip Ct. Fremont, CA', 'From': '+15105555421'})
    .end(function(err, res){
      expect(res).to.have.status(200);
      parseString(res.text, function (err, result) {
        expect(result.Response.Message[0]).to.equal("\nOk, what date and time would you like service.");
        done();
      });
    });
  });
  it('Failure dateTime "next week"', function(done){
    chai.request(server.app)
    .post('/junkTwilio')
    .send({'Body': 'next week', 'From': '+15105555421'})
    .end(function(err, res){
      expect(res).to.have.status(200);
      console.log(res.text);
      parseString(res.text, function (err, result) {
        console.dir(result);
        expect(result.Response.Message[0]).to.have.string("\nPlease provide an exact date & time for service.");
        done();
      });
    });
  });
  it('Normal dateTime 2pm', function(done){
    chai.request(server.app)
    .post('/junkTwilio')
    .send({'Body': 'next thursday at 2pm', 'From': '+15105555421'})
    .end(function(err, res){
      expect(res).to.have.status(200);
      console.log(res.text);
      parseString(res.text, function (err, result) {
        console.dir(result);
        expect(result.Response.Message[0]).to.have.string("\nWould a two hour window starting at this time work for you? (yes/no only):");
        done();
      });
    });
  });
  it('Normal polarAns "No"', function(done){
    chai.request(server.app)
    .post('/junkTwilio')
    .send({'Body': 'Nope', 'From': '+15105555421'})
    .end(function(err, res){
      expect(res).to.have.status(200);
      parseString(res.text, function (err, result) {
        expect(result.Response.Message[0]).to.equal("\nOk, what date and time would you like service.");
        done();
      });
    });
  });
  it('Normal dateTime "5pm"', function(done){
    chai.request(server.app)
    .post('/junkTwilio')
    .send({'Body': 'next thursday at 5pm', 'From': '+15105555421'})
    .end(function(err, res){
      expect(res).to.have.status(200);
      console.log(res.text);
      parseString(res.text, function (err, result) {
        console.dir(result);
        expect(result.Response.Message[0]).to.have.string("\nWould a two hour window starting at this time work for you? (yes/no only):");
        done();
      });
    });
  });
  it('Normal polarAns "No"', function(done){
    chai.request(server.app)
    .post('/junkTwilio')
    .send({'Body': 'no', 'From': '+15105555421'})
    .end(function(err, res){
      expect(res).to.have.status(200);
      parseString(res.text, function (err, result) {
        expect(result.Response.Message[0]).to.equal("\nOk, what date and time would you like service.");
        done();
      });
    });
  });
  it('Normal dateTime "12pm"', function(done){
    chai.request(server.app)
    .post('/junkTwilio')
    .send({'Body': 'next thursday at 12pm', 'From': '+15105555421'})
    .end(function(err, res){
      expect(res).to.have.status(200);
      console.log(res.text);
      parseString(res.text, function (err, result) {
        console.dir(result);
        expect(result.Response.Message[0]).to.have.string("\nWould a two hour window starting at this time work for you? (yes/no only):");
        done();
      });
    });
  });
  it('Normal polarAns "Yes"', function(done){
    chai.request(server.app)
    .post('/junkTwilio')
    .send({'Body': 'yep', 'From': '+15105555421'})
    .end(function(err, res){
      expect(res).to.have.status(200);
      parseString(res.text, function (err, result) {
        expect(result.Response.Message[0]).to.equal("\nWhat name should we use for this appointment?");
        done();
      });
    });
  });
  it('Normal contact "Pranav Jain"', function(done){
    chai.request(server.app)
    .post('/junkTwilio')
    .send({'Body': 'Pranav Jain', 'From': '+15105555421'})
    .end(function(err, res){
      expect(res).to.have.status(200);
      console.log(res.text);
      parseString(res.text, function (err, result) {
        console.dir(result);
        expect(result.Response.Message[0]).to.equal("\nYou are confirmed.  We will call you at this number (+15105555421), 30 minutes before we arrive. If you have any questions, call 717-232-4009.  We will see you soon.");
        done();
      });
    });
  });
});
describe('Testing with weird name 4', function() {
  before(function(done){
    User.remove({phoneID: '10001115105555421'}, function(){
      done();
    });
  });
  it('Root Endpoint check', function(done) {
    chai.request(server.app)
    .get('/')
    .end(function(err, res){
      expect(res).to.have.status(200);
      done();
    });
  });
  it('/junkTwilio endpoint check', function(done){
    chai.request(server.app)
    .post('/junkTwilio')
    .send({'Body': 'JUNK', 'From': '+15105555421'})
    .end(function(err, res){
      expect(res).to.have.status(200);
      //console.log(res.text);
      parseString(res.text, function (err, result) {
        expect(result.Response.Message[0]).to.equal("\nHi. Welcome to Dirty Dog Hauling Text 2 Schedule, powered by NuntAgri. What items would like hauled today?");
        done();
      });
    });
  });
  it('Normal items "A sofa"', function(done){
    chai.request(server.app)
    .post('/junkTwilio')
    .send({'Body': 'A sofa', 'From': '+15105555421'})
    .end(function(err, res){
      expect(res).to.have.status(200);
      parseString(res.text, function (err, result) {
        expect(result.Response.Message[0]).to.equal("\nGreat!  Please provide the property address with your zip code.");
        done();
      });
    });
  });
  it('Normal location "246 Saint Phillip Ct. Fremont, CA"', function(done){
    chai.request(server.app)
    .post('/junkTwilio')
    .send({'Body': '246 Saint Phillip Ct. Fremont, CA', 'From': '+15105555421'})
    .end(function(err, res){
      expect(res).to.have.status(200);
      parseString(res.text, function (err, result) {
        expect(result.Response.Message[0]).to.equal("\nOk, what date and time would you like service.");
        done();
      });
    });
  });
  it('Failure dateTime "next thursday 10-12"', function(done){
    chai.request(server.app)
    .post('/junkTwilio')
    .send({'Body': 'next thursday 10-12', 'From': '+15105555421'})
    .end(function(err, res){
      expect(res).to.have.status(200);
      console.log(res.text);
      parseString(res.text, function (err, result) {
        console.dir(result);
        expect(result.Response.Message[0]).to.have.string("\nPlease provide an exact date & time for service.");
        done();
      });
    });
  });
  it('Normal dateTime "2pm"', function(done){
    chai.request(server.app)
    .post('/junkTwilio')
    .send({'Body': 'next thursday at 2pm', 'From': '+15105555421'})
    .end(function(err, res){
      expect(res).to.have.status(200);
      console.log(res.text);
      parseString(res.text, function (err, result) {
        console.dir(result);
        expect(result.Response.Message[0]).to.have.string("\nWould a two hour window starting at this time work for you? (yes/no only):");
        done();
      });
    });
  });
  it('Normal polarAns "Yes"', function(done){
    chai.request(server.app)
    .post('/junkTwilio')
    .send({'Body': 'Yes', 'From': '+15105555421'})
    .end(function(err, res){
      expect(res).to.have.status(200);
      parseString(res.text, function (err, result) {
        expect(result.Response.Message[0]).to.equal("\nWhat name should we use for this appointment?");
        done();
      });
    });
  });
  it('Normal contact "Yay Text2Haul"', function(done){
    chai.request(server.app)
    .post('/junkTwilio')
    .send({'Body': 'Yay Text2Haul', 'From': '+15105555421'})
    .end(function(err, res){
      expect(res).to.have.status(200);
      console.log(res.text);
      parseString(res.text, function (err, result) {
        console.dir(result);
        expect(result.Response.Message[0]).to.equal("\nYou are confirmed.  We will call you at this number (+15105555421), 30 minutes before we arrive. If you have any questions, call 717-232-4009.  We will see you soon.");
        done();
      });
    });
  });
});
describe('Testing with weird item', function() {
  before(function(done){
    User.remove({phoneID: '10001115105555421'}, function(){
      done();
    });
  });
  it('Root Endpoint check', function(done) {
    chai.request(server.app)
    .get('/')
    .end(function(err, res){
      expect(res).to.have.status(200);
      done();
    });
  });
  it('/junkTwilio endpoint check', function(done){
    chai.request(server.app)
    .post('/junkTwilio')
    .send({'Body': 'JUNK', 'From': '+15105555421'})
    .end(function(err, res){
      expect(res).to.have.status(200);
      //console.log(res.text);
      parseString(res.text, function (err, result) {
        expect(result.Response.Message[0]).to.equal("\nHi. Welcome to Dirty Dog Hauling Text 2 Schedule, powered by NuntAgri. What items would like hauled today?");
        done();
      });
    });
  });
  it('weird item "General debris"', function(done){
    chai.request(server.app)
    .post('/junkTwilio')
    .send({'Body': 'General debris', 'From': '+15105555421'})
    .end(function(err, res){
      expect(res).to.have.status(200);
      parseString(res.text, function (err, result) {
        expect(result.Response.Message[0]).to.equal("\nGreat!  Please provide the property address with your zip code.");
        done();
      });
    });
  });
  it('Normal location "246 Saint Phillip Ct. Fremont, CA"', function(done){
    chai.request(server.app)
    .post('/junkTwilio')
    .send({'Body': '246 Saint Phillip Ct. Fremont, CA', 'From': '+15105555421'})
    .end(function(err, res){
      expect(res).to.have.status(200);
      parseString(res.text, function (err, result) {
        expect(result.Response.Message[0]).to.equal("\nOk, what date and time would you like service.");
        done();
      });
    });
  });
  it('Normal dateTime "2pm"', function(done){
    chai.request(server.app)
    .post('/junkTwilio')
    .send({'Body': 'next thursday at 2pm', 'From': '+15105555421'})
    .end(function(err, res){
      expect(res).to.have.status(200);
      console.log(res.text);
      parseString(res.text, function (err, result) {
        console.dir(result);
        expect(result.Response.Message[0]).to.have.string("\nWould a two hour window starting at this time work for you? (yes/no only):");
        done();
      });
    });
  });
  it('Normal polarAns "Yes"', function(done){
    chai.request(server.app)
    .post('/junkTwilio')
    .send({'Body': 'Yes', 'From': '+15105555421'})
    .end(function(err, res){
      expect(res).to.have.status(200);
      parseString(res.text, function (err, result) {
        expect(result.Response.Message[0]).to.equal("\nWhat name should we use for this appointment?");
        done();
      });
    });
  });
  it('Normal contact "Pranav Jain"', function(done){
    chai.request(server.app)
    .post('/junkTwilio')
    .send({'Body': 'Yay Text2Haul', 'From': '+15105555421'})
    .end(function(err, res){
      expect(res).to.have.status(200);
      console.log(res.text);
      parseString(res.text, function (err, result) {
        console.dir(result);
        expect(result.Response.Message[0]).to.equal("\nYou are confirmed.  We will call you at this number (+15105555421), 30 minutes before we arrive. If you have any questions, call 717-232-4009.  We will see you soon.");
        done();
      });
    });
  });
});

describe('Testing actionable functions', function() {
  it('Test geocoding "246 Saint Phillip Ct. Fremont, CA"', function(done){
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
    geocoder.geocode("246 Saint Phillip Ct. Fremont, CA")
      .then(function(res) {
        console.log(res);
        if(res.length != 0){
          console.log("We found the geolocation.");

        }else{
          console.log("We failed to find location.");
          console.log("Res-length: " + res.length);
        }
        expect(res.length).to.be.above(0);
        console.log(res[0].city);
        console.log(res[0].state);
        console.log(res[0].zipcode);
        expect(res[0].streetName).to.equal("Saint Phillip Court");
        var abbr = server.abbrRegion(res[0].state, "abbr");
        console.log(abbr);
        expect(abbr).to.equal("CA");
        done();
        //sessions[sessionId].location = loc;
      }).catch(function(err) {
        console.log(err);
        expect(1, "Got an error running geocoder").to.equal(2);
        done();
      });
  });
  it('Test emailing invoice', function(done){
    //geocoder using OpenStreetMap
    var invoice = {
      "logo": "http://nuntagri.com/images/NuntagriFinal.png",
      "from": "NuntAgri\n7735 Althea Ave.\nHarrisburg, Pa 17112",
      "to": "Dirty Dog Hauling",
      "currency": "usd",
      "number": "INV-001",
      "date": new Date(),
      "payment_terms": "Auto-Billed - Do Not Pay",
      "items": [
        {
          "name": "Leads from NuntAgri ",
          "quantity": 20,
          "unit_cost": 5
        }
      ],
      "notes": "You should be emailed a receipt for this shortly.",
      "terms": "No need to submit payment. You will be auto-billed for this invoice."
    };

    server.generateInvoice(invoice, 'invoice.pdf', function() {
      console.log("Saved invoice to invoice.pdf");
      server.sendEmail("pranajain@gmail.com", function(result){
        console.log("RESULT: " + JSON.stringify(result));
        expect(result).to.exist;
        done();
      }, function(error){
        console.log("ERROR: " + error);
        expect(error).to.not.exist;
        done();
      });
    }, function(error) {
      console.error(error);
    });
  });
  /*it('test TimeZone manipulation', function(done){

    var date = new Date("2018-05-15T14:00:00.000-04:00");
    console.log(date);
    var timezoneOff = -5;
    date.setMinutes(0);
    date.setSeconds(0);
    //to fit time windows that we have set up (2 hours each) from 8 am to 6pm
    //var today = new Date();
    if (date.isDstObserved()) {
        console.log ("Daylight saving time!");
        timezoneOff++;
    }
    console.log(date.getUTCHours() + timezoneOff);
    if((date.getUTCHours() + timezoneOff) % 2 != 0){
      date.setUTCHours(date.getUTCHours() - 1);
    }
    console.log(date.getUTCHours() + timezoneOff);
    expect(date.getUTCHours() + timezoneOff, "Got an error running function").to.equal(14);

    done();
  });*/
});
