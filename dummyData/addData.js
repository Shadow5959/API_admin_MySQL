const express = require('express');
const mysql = require('mysql2/promise'); // Import the promise version of mysql2
const dotenv = require('dotenv');
dotenv.config();

const app = express();
app.use(express.json());

// Define your database configuration (adjust these values or set them in your .env file)
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'your_db_username',
  password: process.env.DB_PASSWORD || 'your_db_password',
  database: process.env.DB_NAME || 'jeweltest',
};
console.log(dbConfig);

app.post('/api/importData', async (req, res) => {
    const data = req.body; // Your JSON payload
    let connection;
    try {
      connection = await mysql.createConnection(dbConfig);
      await connection.beginTransaction();
  
      // Disable foreign key checks and truncate tables to clear previous data
      await connection.execute("SET FOREIGN_KEY_CHECKS = 0");
      // Truncate child tables first, then parent tables:
      await connection.execute("TRUNCATE TABLE orderitmes");
      await connection.execute("TRUNCATE TABLE orders");
      await connection.execute("TRUNCATE TABLE useraddress");
      await connection.execute("TRUNCATE TABLE users");
      await connection.execute("TRUNCATE TABLE variantcover");
      await connection.execute("TRUNCATE TABLE productimages");
      await connection.execute("TRUNCATE TABLE variant");
      await connection.execute("TRUNCATE TABLE product");
      await connection.execute("TRUNCATE TABLE subcategory");
      await connection.execute("TRUNCATE TABLE producttype");
      await connection.execute("TRUNCATE TABLE category");
      await connection.execute("TRUNCATE TABLE currency");
      await connection.execute("TRUNCATE TABLE language");
      await connection.execute("SET FOREIGN_KEY_CHECKS = 1");
  
      // ---------- Insert into currency ----------
      for (const currency of data.currency) {
        await connection.execute(
          'INSERT INTO currency (cur_id, cur_name) VALUES (?, ?)',
          [currency.cur_id, currency.cur_name]
        );
      }
  
      // ---------- Insert into category ----------
      for (const category of data.category) {
        await connection.execute(
          'INSERT INTO category (cat_id, cat_name) VALUES (?, ?)',
          [category.cat_id, category.cat_name]
        );
      }
  
      // ---------- Insert into producttype ----------
      for (const pt of data.producttype) {
        await connection.execute(
          'INSERT INTO producttype (type_id, type_Name) VALUES (?, ?)',
          [pt.type_id, pt.type_Name]
        );
      }
  
      // ---------- Insert into subcategory ----------
      for (const subcat of data.subcategory) {
        await connection.execute(
          'INSERT INTO subcategory (subcategory_id, cat_id, subcategory_name) VALUES (?, ?, ?)',
          [subcat.subcategory_id, subcat.cat_id, subcat.subcategory_name]
        );
      }
  
      // ---------- Insert into product ----------
      for (const prod of data.product) {
        await connection.execute(
          'INSERT INTO product (product_id, product_name, product_desc, cat_id, subcategory_id, created_at, updated_at, type_id, product_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            prod.product_id,
            prod.product_name,
            prod.product_desc,
            prod.cat_id,
            prod.subcategory_id,
            prod.created_at,
            prod.updated_at,
            prod.type_id,
            prod.product_active,
          ]
        );
      }
  
      // ---------- Insert into variant ----------
      for (const variant of data.variant) {
        await connection.execute(
          'INSERT INTO variant (variant_id, variant_name, product_id, product_name, price, stock, size, material) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [
            variant.variant_id,
            variant.variant_name,
            variant.product_id,
            variant.product_name,
            variant.price,
            variant.stock,
            variant.size,
            variant.material,
          ]
        );
      }
  
      // ---------- Insert into productimages ----------
      for (const image of data.productimages) {
        await connection.execute(
          'INSERT INTO productimages (image_id, variant_id, image_url) VALUES (?, ?, ?)',
          [image.image_id, image.variant_id, image.image_url]
        );
      }
  
      // ---------- Insert into variantcover ----------
      for (const cover of data.variantcover) {
        await connection.execute(
          'INSERT INTO variantcover (cover_id, variant_id, cover_url, variant_name) VALUES (?, ?, ?, ?)',
          [cover.cover_id, cover.variant_id, cover.cover_url, cover.variant_name]
        );
      }
  
      // ---------- Insert into users ----------
      for (const user of data.users) {
        await connection.execute(
          'INSERT INTO users (user_id, user_name, user_email, user_number, user_gender, user_password, user_verify, created_at, by_user, active_user) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            user.user_id,
            user.user_name,
            user.user_email,
            user.user_number,
            user.user_gender,
            user.user_password,
            user.user_verify,
            user.created_at,
            user.by_user,
            user.active_user,
          ]
        );
      }
  
      // ---------- Insert into useraddress ----------
      for (const addr of data.useraddress) {
        await connection.execute(
          'INSERT INTO useraddress (address_id, user_id, address, created_at, address_active) VALUES (?, ?, ?, ?, ?)',
          [addr.address_id, addr.user_id, addr.address, addr.created_at, addr.address_active]
        );
      }
  
      // ---------- Insert into orders ----------
      for (const order of data.orders) {
        await connection.execute(
          'INSERT INTO orders (order_id, user_id, order_date, `total amount`, status, cur_id) VALUES (?, ?, ?, ?, ?, ?)',
          [order.order_id, order.user_id, order.order_date, order.total_amount, order.status, order.cur_id]
        );
      }
  
      // ---------- Insert into orderitmes ----------
      for (const orderItem of data.orderitmes) {
        await connection.execute(
          'INSERT INTO orderitmes (order_item_id, order_id, variant_id, quantity, price) VALUES (?, ?, ?, ?, ?)',
          [orderItem.order_item_id, orderItem.order_id, orderItem.variant_id, orderItem.quantity, orderItem.price]
        );
      }
  
      // ---------- Insert into language ----------
      for (const lang of data.language) {
        await connection.execute(
          'INSERT INTO language (lang_id, lang_name, cur_id) VALUES (?, ?, ?)',
          [lang.lang_id, lang.lang_name, lang.cur_id]
        );
      }
  
      await connection.commit();
      res.status(200).json({ message: 'Data imported successfully!' });
    } catch (error) {
      if (connection) await connection.rollback();
      console.error('Error importing data:', error);
      res.status(500).json({ error: 'Data import failed', details: error.message });
    } finally {
      if (connection) await connection.end();
    }
  });
  

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
