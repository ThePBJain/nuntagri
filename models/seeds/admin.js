var User = require('../user');


var seedAdmin = function() {
  User.find({}, function(err, documents) {
    if (documents.length === 0){
      var password = 'admin';
      var user = new User({
        email: 'ad@min.com',
        admin: true,
        password: password,
        stripe: 'cus_A9PiFpEe2vpHCI'
      });
      user.generateHash(password, function(err, hash) {
        user.password = hash;
        user.save();
        console.log('Dummy admin added!');
      });
      //add client
      var password = 'dirtydoghauling';
      var user = new User({
        email: 'lnelson@dirtydoghauling.com',
        admin: false,
        password: password,
        stripe: 'cus_A9PiFpEe2vpHCI'
      });
      user.generateHash(password, function(err, hash) {
        user.password = hash;
        user.save();
        console.log('Dummy client added!');
      });
    }
  });
};

module.exports = seedAdmin;
