var chai = require('chai');
var chaiHttp = require('chai-http');
var assert = require('chai').assert;
var server = require('../server');
var expect  = require('chai').expect;
var parseString = require('xml2js').parseString;
var User = require('../models/user');

//load the plugins
chai.use(chaiHttp);


describe('Testing Normal 1', function() {
  before(function(done){
    User.remove({phoneID: '10001115105555421'}, function(){
      done();
    });
  });
  it('Root Endpoint check', function(done) {
    chai.request(server)
    .get('/')
    .end(function(err, res){
      expect(res).to.have.status(200);
      expect(res.text).to.equal("Hi PJ");
      done();
    });
  });
  it('/testing endpoint check', function(done){
    chai.request(server)
    .post('/testing')
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
    chai.request(server)
    .post('/testing')
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
    chai.request(server)
    .post('/testing')
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
    chai.request(server)
    .post('/testing')
    .send({'Body': 'next tuesday at 2pm', 'From': '+15105555421'})
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
    chai.request(server)
    .post('/testing')
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
    chai.request(server)
    .post('/testing')
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
  it('/testing Normal "JUNK"', function(done){
    chai.request(server)
    .post('/testing')
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
    chai.request(server)
    .post('/testing')
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
    chai.request(server)
    .post('/testing')
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
    chai.request(server)
    .post('/testing')
    .send({'Body': 'next tuesday at 2pm', 'From': '+15105555421'})
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
    chai.request(server)
    .post('/testing')
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
  it('/testing endpoint check', function(done){
    chai.request(server)
    .post('/testing')
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
    chai.request(server)
    .post('/testing')
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
    chai.request(server)
    .post('/testing')
    .send({'Body': '246 Saint Phillip Ct. Fremont, CA', 'From': '+15105555421'})
    .end(function(err, res){
      expect(res).to.have.status(200);
      parseString(res.text, function (err, result) {
        expect(result.Response.Message[0]).to.equal("\nOk, what date and time would you like service.");
        done();
      });
    });
  });
  it('Normal dateTime 2pm', function(done){
    chai.request(server)
    .post('/testing')
    .send({'Body': 'next tuesday at 2pm', 'From': '+15105555421'})
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
    chai.request(server)
    .post('/testing')
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
    chai.request(server)
    .post('/testing')
    .send({'Body': 'next tuesday at 5pm', 'From': '+15105555421'})
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
    chai.request(server)
    .post('/testing')
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
    chai.request(server)
    .post('/testing')
    .send({'Body': 'next tuesday at 12pm', 'From': '+15105555421'})
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
    chai.request(server)
    .post('/testing')
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
    chai.request(server)
    .post('/testing')
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
    chai.request(server)
    .get('/')
    .end(function(err, res){
      expect(res).to.have.status(200);
      expect(res.text).to.equal("Hi PJ");
      done();
    });
  });
  it('/testing endpoint check', function(done){
    chai.request(server)
    .post('/testing')
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
    chai.request(server)
    .post('/testing')
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
    chai.request(server)
    .post('/testing')
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
    chai.request(server)
    .post('/testing')
    .send({'Body': 'next tuesday at 2pm', 'From': '+15105555421'})
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
    chai.request(server)
    .post('/testing')
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
    chai.request(server)
    .post('/testing')
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
        var abbr = abbrRegion(res[0].state, "abbr");
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
  it('test TimeZone manipulation', function(done){

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
  });
});


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
