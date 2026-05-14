exports.handler = async () => {
  const menu = require('../../data/menu.json');
  return { statusCode: 200, headers: {'Content-Type':'application/json'}, body: JSON.stringify(menu) };
};