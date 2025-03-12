// generateData.js
const fs = require('fs');
const bcrypt = require('bcryptjs');

const { faker } = require('@faker-js/faker');

// Arrays for each table
const currencies = [];
const categories = [];
const producttypes = [];
const subcategories = [];
const products = [];
const variants = [];
const productimages = [];
const variantcovers = [];
const users = [];
const useraddresses = [];
const orders = [];
const orderitmes = []; // table name "orderitmes"
const languages = [];
// Array to store plain text passwords mapping for users
const userPasswords = [];

// ---------- Currencies ----------
const currencyNames = ['Dollars', 'Euro', 'Rupees', 'Pounds', 'Yen'];
currencyNames.forEach((name, index) => {
  currencies.push({
    cur_id: index + 1,
    cur_name: name
  });
});

// ---------- Categories ----------
const categoryNames = ['Rings', 'Necklaces', 'Earrings', 'Bracelets', 'Anklets'];
categoryNames.forEach((name, index) => {
  categories.push({
    cat_id: index + 1,
    cat_name: name
  });
});

// ---------- Product Types ----------
const productTypeNames = ['Best Sellers', 'New Arrival', 'Regular', 'Sale'];
productTypeNames.forEach((name, index) => {
  producttypes.push({
    type_id: index + 1,
    type_Name: name
  });
});

// ---------- Subcategories ----------
// For each category, create 2 subcategories (e.g., "Classic" and "Modern")
let subcategoryId = 1;
categories.forEach(cat => {
  ['Classic', 'Modern'].forEach(style => {
    subcategories.push({
      subcategory_id: subcategoryId++,
      cat_id: cat.cat_id,
      subcategory_name: `${cat.cat_name} ${style}`
    });
  });
});

// ---------- Products ----------
// Create 10 products with random details, each linked to a category, subcategory, and product type.
for (let i = 1; i <= 10; i++) {
  const category = faker.helpers.arrayElement(categories);
  // Get subcategories that belong to this category
  const relatedSubcats = subcategories.filter(sc => sc.cat_id === category.cat_id);
  // Choose one subcategory for the product
  const subcategory = faker.helpers.arrayElement(relatedSubcats);
  const producttype = faker.helpers.arrayElement(producttypes);
  const productName = faker.commerce.productName();
  const date = faker.date.recent(30);
  products.push({
    product_id: i,
    product_name: productName,
    product_desc: faker.commerce.productDescription(),
    cat_id: category.cat_id,
    subcategory_id: subcategory ? subcategory.subcategory_id : null,
    created_at: date.toISOString(),
    updated_at: date.toISOString(),
    type_id: producttype.type_id,
    product_active: faker.datatype.boolean() ? 1 : 0
  });
}

// ---------- Variants ----------
// For each product, create 2 variants.
// The variant name now includes the product name and its subcategory name (if available)
let variantId = 1;
products.forEach(product => {
  // Lookup the subcategory object for this product
  const subcat = subcategories.find(sc => sc.subcategory_id === product.subcategory_id);
  for (let i = 0; i < 2; i++) {
    const size = faker.helpers.arrayElement([
      'S',
      'M',
      'L',
      'XL',
      faker.number.int({ min: 5, max: 20 }).toString()
    ]);
    const material = faker.commerce.productMaterial();
    const price = parseInt(faker.commerce.price(10, 100, 0));
    const stock = faker.number.int({ min: 1, max: 50 });
    // Build a variant name that includes subcategory name if available
    const variantName = subcat
      ? `${product.product_name} - ${subcat.subcategory_name} Variant ${i + 1}`
      : `${product.product_name} Variant ${i + 1}`;
    variants.push({
      variant_id: variantId,
      variant_name: variantName,
      product_id: product.product_id,
      product_name: product.product_name, // mirrors product name as per trigger logic
      price: price,
      stock: stock,
      size: size,
      material: material
    });
    variantId++;
  }
});

// ---------- Product Images ----------
// Create one image per variant.
variants.forEach(variant => {
  productimages.push({
    image_id: variant.variant_id, // using same id for simplicity
    variant_id: variant.variant_id,
    image_url: `https://picsum.photos/${faker.number.int({ min: 200, max: 500 })}/${faker.number.int({ min: 200, max: 500 })}?random=${faker.number.int()}`
  });
});

// ---------- Variant Covers ----------
// Create one cover entry per variant.
variants.forEach(variant => {
  variantcovers.push({
    cover_id: variant.variant_id, // using same id for simplicity
    variant_id: variant.variant_id,
    cover_url: `https://picsum.photos/${faker.number.int({ min: 200, max: 500 })}/${faker.number.int({ min: 200, max: 500 })}?random=${faker.number.int()}`,
    variant_name: variant.variant_name
  });
});

/// Helper function to generate an exact 10-digit number as a string
function generateTenDigitNumber() {
  // Generates a number between 1000000000 and 9999999999 (inclusive)
  return (Math.floor(Math.random() * 9000000000) + 1000000000).toString();
}

// ---------- Users ----------
// Generate 100 users with hashed passwords and plain text mapping.
// All users will have a 10-digit phone number, active_user set to 1, and user_verify set to 1.
for (let i = 1; i <= 100; i++) {
  const plainPassword = faker.internet.password();
  const hashedPassword = bcrypt.hashSync(plainPassword, 10);
  const user = {
    user_id: i,
    user_name: faker.person.fullName(),
    user_email: faker.internet.email(),
    user_number: generateTenDigitNumber(), // exactly 10 digits
    user_gender: faker.helpers.arrayElement(['Male', 'Female']),
    user_password: hashedPassword,
    user_verify: 1,      // always set to 1
    created_at: faker.date.past(1).toISOString(),
    by_user: 1,
    active_user: 1       // always 1
  };
  users.push(user);
  userPasswords.push({
    user_id: i,
    user_email: user.user_email,
    user_name: user.user_name,
    plain_password: plainPassword
  });
}


// ---------- User Addresses ----------
// Generate 2 addresses for each user.
let addressId = 1;
users.forEach(user => {
  for (let i = 0; i < 2; i++) {
    useraddresses.push({
      address_id: addressId++,
      user_id: user.user_id,
      address: faker.address.streetAddress(),
      created_at: faker.date.recent(30).toISOString(),
      address_active: faker.datatype.boolean() ? 1 : 0
    });
  }
});

// ---------- Orders ----------
// Create 8 orders.
for (let i = 1; i <= 8; i++) {
  const user = faker.helpers.arrayElement(users);
  const currency = faker.helpers.arrayElement(currencies);
  const orderDate = faker.date.recent(30);
  orders.push({
    order_id: i,
    user_id: user.user_id,
    order_date: orderDate.toISOString(),
    total_amount: faker.number.int({ min: 50, max: 500 }),
    status: faker.datatype.boolean() ? 1 : 0,
    cur_id: currency.cur_id
  });
}

// ---------- Order Items (orderitmes) ----------
// For each order, create 1 or 2 items.
let orderItemId = 1;
orders.forEach(order => {
  const numItems = faker.number.int({ min: 1, max: 2 });
  for (let i = 0; i < numItems; i++) {
    const variant = faker.helpers.arrayElement(variants);
    orderitmes.push({
      order_item_id: orderItemId++,
      order_id: order.order_id,
      variant_id: variant.variant_id,
      quantity: faker.number.int({ min: 1, max: 5 }),
      price: variant.price
    });
  }
});

// ---------- Languages ----------
// ---------- Languages ----------
// Use a shuffled array of unique language names and select the first three
const langNames = ['English', 'Spanish', 'French', 'German', 'Chinese'];
const uniqueLangs = faker.helpers.shuffle(langNames).slice(0, 3);
uniqueLangs.forEach((lang, index) => {
  const currency = faker.helpers.arrayElement(currencies);
  languages.push({
    lang_id: index + 1,
    lang_name: lang,
    cur_id: currency.cur_id
  });
});


// ---------- Assemble Final Data Object ----------
const data = {
  currency: currencies,
  category: categories,
  producttype: producttypes,
  subcategory: subcategories,
  product: products,
  variant: variants,
  productimages: productimages,
  variantcover: variantcovers,
  users: users,
  useraddress: useraddresses,
  orders: orders,
  orderitmes: orderitmes,
  language: languages
};

// Write the complete data to dummydata.json
fs.writeFileSync("dummydata.json", JSON.stringify(data, null, 2));
console.log("dummydata.json has been created with the fake data.");

// Write the plain text passwords mapping to user_passwords.json
fs.writeFileSync("user_passwords.json", JSON.stringify(userPasswords, null, 2));
console.log("user_passwords.json has been created with the plain text user passwords.");
