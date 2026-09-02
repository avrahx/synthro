const getColors = require('get-image-colors');
const path = require('path');

getColors(path.join(__dirname, '../frontend/public/assets/Banner.jpg')).then(colors => {
  console.log("Banner Colors:");
  colors.forEach(color => console.log(color.hex()));
});

getColors(path.join(__dirname, '../frontend/public/assets/Logo.jpg')).then(colors => {
  console.log("Logo Colors:");
  colors.forEach(color => console.log(color.hex()));
});
