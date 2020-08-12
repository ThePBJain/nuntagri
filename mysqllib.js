const mysql = require( "mysql2" );


let pool = mysql.createPool({
  host : process.env.MYSQL_HOST,
  user : process.env.MYSQL_USER,
  password: process.env.MYSQL_PASS,
  database : "nuntagri",
  ssl : "Amazon RDS",
  connectionLimit: 2, // Default value is 10.
  waitForConnections: true, // Default value.
  queueLimit: 0 // 0=Unlimited - default value.
}).promise();

// results contains rows returned by server
// fields contains extra meta data about results, if available

async function getAllGroups() {
  const [results, fields] = await pool.query('SELECT DISTINCT products.group FROM nuntagri.products');
  console.log("Groups: " + JSON.stringify(results));
  return results.map(value => value.group);
}

async function getGroupProductsFrom(message) {
  const [results, fields] = await pool.execute(`SELECT * FROM nuntagri.products WHERE ? LIKE concat('%',products.group,'%')`, [message]);
  console.log("Group Products: " + JSON.stringify(results));
  return results;
}

async function getProduct(name, number) {
  let sql = 'SELECT * FROM nuntagri.products WHERE name = ?';
  let value = name;
  if (!name) {
    sql = 'SELECT * FROM nuntagri.products WHERE id = ?';
    value = number;
  }
  const [results, fields] = await pool.execute(sql, [value]);
  console.log("Product: " + JSON.stringify(results));
  return results[0];
}

async function getUser(phoneNumber) {
  const [results, fields] = await pool.execute('SELECT * FROM nuntagri.users WHERE phone_num = ?', [phoneNumber]);
  console.log("\n\nUser: " + JSON.stringify(results));
  return results[0];
}

module.exports = {
  pool: pool,
  getAllGroups: getAllGroups,
  getGroupProductsFrom: getGroupProductsFrom,
  getProduct: getProduct,
  getUser: getUser
};
