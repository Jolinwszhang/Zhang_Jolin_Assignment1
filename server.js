// loads the products array into server memory from the products.json file
const products = require(__dirname + '/products.json'); // load the products.json file into memory

const express = require('express');
const app = express();

// This processes the form data in a POST request so that the form data appears in request.body
const myParser = require("body-parser");
app.use(myParser.urlencoded({ extended: true }));

// Log requests to the console
app.all('*', function (request, response, next) {
  console.log(request.method + ' to ' + request.path);
  next();
});

// A micro-service to return the products data currently in memory on the server as
// javascript to define the products array
app.get('/products.json', function (req, res, next) {
  res.json(products);
});

// A micro-service to process the product quantities from the form data
// redirect to invoice if quantities are valid, otherwise redirect back to products_display
app.post('/process_purchase_form', function (req, res, next) {
  // only process if purchase form submitted
  const errors = {}; // assume no errors to start
  let quantities = [];
  if (typeof req.body['quantity_textbox'] != 'undefined') {
    quantities = req.body['quantity_textbox'];
    // Loop through the quantities submitted
    let has_quantities = false;
    for (let i = 0; i < quantities.length; i++) {
      // validate the quantity is a non-negative integer. Add to errors object if not.
      if (!isNonNegInt(quantities[i])) {
        errors['quantity' + i] = isNonNegInt(quantities[i], true).join('<br>');
      }
      // validate the quantity requested is less than or equal to the quantity available. Add to errors object if not.
      // check if it exceeds the quantity available
      const productIndex = parseInt(i);
      if (quantities[i] > products[productIndex].quantity_available) {
        errors['quantity' + i] = 'Quantity requested exceeds available quantity';
      }
      if (quantities[i] > 0) {
        has_quantities = true;
        // any quantities selected 
      }
    }
    // if no quantities are greater than zero make no quantities error report
    // Check the quantities array has at least one value greater than 0 (i.e. something was purchased). Add to errors object if not.

    // error quantities is no_quantities error
    if (has_quantities === false) {
      errors['no_quantities'] = 'Oii! Need to select your board to ride some gnarly waves!';
    }
    // This just logs the purchase data to the console and where it came from. It is not required.
    console.log(Date.now() + ': Purchase made from ip ' + req.ip + ' data: ' + JSON.stringify(req.body));
  }
  // create a query string with data from the form
  const params = new URLSearchParams();
  params.append('quantities', JSON.stringify(quantities));

  // If there are errors, send the user back to fix otherwise redirect to the invoice with the quantities in the query string
  if (Object.keys(errors).length > 0) {
    // Have errors, redirect back to store where errors came from to fix and try again
    params.append('errors', JSON.stringify(errors));
    res.redirect('store.html?' + params.toString());
  } else {
    for (let i = 0; i < quantities.length; i++) {
      const quantitySold = Number(quantities[i]);
      const product = products[i];
      product.quantity_available -= quantitySold;
      product.quantity_sold += quantitySold;
    }
    // Reduce the quantities of each product purchased from the quantities available
    res.redirect('./invoice.html?' + params.toString());
  }
});

// This adds middleware to serve files from the public directory
app.use(express.static(__dirname + '/public'));
app.listen(8080, () => console.log(`listening on port 8080`));

function isNonNegInt(q, returnErrors = false) {
  let errs = []; // assume no errors at first
  if (q == '') q = 0; // handle blank inputs as if they are 0
  if (Number(q) != q) errs.push('Not a number!'); // Check if string is a number value
  else {
    if (q < 0) errs.push('Negative value!'); // Check if it is non-negative
    if (parseInt(q) != q) errs.push('Not an integer!'); // Check that it is an integer
  }
  return returnErrors ? errs : (errs.length == 0);
}
