const db = require('../database.js');



const products = async (req, res) => {
    const query = `SELECT * from jeweltest.product p
    LEFT JOIN jeweltest.variant v on p.product_id = v.product_id
    LEFT JOIN jeweltest.category c on p.cat_id = c.cat_id
    LEFT JOIN jeweltest.productimages pi on v.variant_id = pi.variant_id

    `;
    db.query(query, (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Server error");
        }
        const sortObjectKeys = (obj) => 
            Object.keys(obj)
                .sort() // Sort keys alphabetically
                .reduce((sortedObj, key) => {
                    sortedObj[key] = obj[key]; // Add sorted keys to a new object
                    return sortedObj;
                }, {});

        const sortedResults = results.map(result => sortObjectKeys(result));
        return res.status(200).json(sortedResults);
    });
};

const productVariants = async (req, res) => {
    const { id } = req.query;
    console.log(`received id: ${id}`);
    if (!id) {
        return res.status(400).send("Product id is required");
    }
    const query = `SELECT v.*, vc.cover_url FROM jeweltest.variant v
    LEFT JOIN jeweltest.variantcover vc on v.variant_id = vc.variant_id
    WHERE v.product_id = ?`;
    db.query(query, [id], (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Server error");
        }
        const sortObjectKeys = (obj) => 
            Object.keys(obj)
                .sort() // Sort keys alphabetically
                .reduce((sortedObj, key) => {
                    sortedObj[key] = obj[key]; // Add sorted keys to a new object
                    return sortedObj;
                }, {});

        const sortedResults = results.map(result => sortObjectKeys(result));
        return res.status(200).json(sortedResults);
    });
};

const addProduct = async (req, res) => {
  const { name, description, price, category, stock, type, subcategory, variants, image, material } = req.body;
  
  console.log("Received data:", req.body); // Debugging log
  
  if (!name || !category || !type || !subcategory) {
      return res.status(400).json({ error: "Missing required fields" });
  }

  db.getConnection((err, connection) => {
      if (err) return res.status(500).json({ error: "Server error getting connection" });

      connection.beginTransaction(err => {
          if (err) {
              connection.release();
              return res.status(500).json({ error: "Server error starting transaction" });
          }

          // Insert product record
          const productQuery = 'INSERT INTO product SET ?';
          const productData = { 
              product_name: name, 
              product_desc: description, 
              cat_id: category, 
              type_id: type, 
              subcategory_id: subcategory,
              created_at: new Date()
          };
          
          connection.query(productQuery, productData, (err, productResults) => {
              if (err) {
                  connection.rollback(() => {
                      connection.release();
                      return res.status(500).json({ error: "Server error inserting product" });
                  });
              }

              const productId = productResults.insertId;
              let parsedVariants = [];

              if (variants && typeof variants === 'string') {
                  try {
                      parsedVariants = JSON.parse(variants);
                  } catch (error) {
                      connection.rollback(() => {
                          connection.release();
                          return res.status(400).json({ error: "Invalid JSON format for variants" });
                      });
                  }
              }

              if (parsedVariants.length > 0) {
                  const variantQuery = `
                      INSERT INTO variant 
                      (variant_name, product_id, product_name, price, stock, size, material)
                      VALUES ?
                  `;

                  const variantValues = parsedVariants.map(variant => [
                      variant.variant_name,
                      productId,
                      name,
                      variant.price,
                      variant.stock,
                      variant.size,
                      variant.material
                  ]);

                  connection.query(variantQuery, [variantValues], (err, variantResult) => {
                      if (err) {
                          connection.rollback(() => {
                              connection.release();
                              return res.status(500).json({ error: "Failed to insert variants" });
                          });
                      }

                      if (req.files && req.files.variantcover && req.files.variantcover.length > 0) {
                          const variantCoverFile = req.files.variantcover[0];
                          const variantCoverQuery = 'INSERT INTO variantcover SET ?';
                          const coverData = {
                              variant_id: variantResult.insertId,
                              cover_url: variantCoverFile.filename,
                              variant_name: parsedVariants[0].variant_name
                          };

                          connection.query(variantCoverQuery, coverData, (err) => {
                              if (err) {
                                  connection.rollback(() => {
                                      connection.release();
                                      return res.status(500).json({ error: "Failed to insert variant cover" });
                                  });
                              }

                              connection.commit(err => {
                                  if (err) {
                                      connection.rollback(() => {
                                          connection.release();
                                          return res.status(500).json({ error: "Failed to commit transaction" });
                                      });
                                  }

                                  connection.release();
                                  return res.status(201).json({
                                      message: "Product, variants, and variant cover added successfully",
                                      product_id: productId,
                                      variants_inserted: variantResult.affectedRows
                                  });
                              });
                          });
                      } else {
                          connection.commit(err => {
                              if (err) {
                                  connection.rollback(() => {
                                      connection.release();
                                      return res.status(500).json({ error: "Failed to commit transaction" });
                                  });
                              }

                              connection.release();
                              return res.status(201).json({
                                  message: "Product and variants added successfully",
                                  product_id: productId,
                                  variants_inserted: variantResult.affectedRows
                              });
                          });
                      }
                  });
              } else {
                  connection.commit(err => {
                      if (err) {
                          connection.rollback(() => {
                              connection.release();
                              return res.status(500).json({ error: "Failed to commit transaction" });
                          });
                      }

                      connection.release();
                      return res.status(201).json({
                          message: "Product added successfully",
                          product_id: productId
                      });
                  });
              }
          });
      });
  });
};

const updateProduct = async (req, res) => {
    const {id} = req.query;
    const { category } = req.body;
    console.log(`received data id: ${id}, category: ${category}`);
    if (!id) {
        return res.status(400).send("Category id is required");
    }
    db.query('SELECT cat_name FROM jeweltest.category WHERE cat_id = ?', [id], (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Server error");
        }
        if (results.length === 0) {
            return res.status(404).send("Category not found");
        }
        const oldCategory = results[0].cat_name;
        const updatedCategory = category || oldCategory;

        db.query('UPDATE category SET cat_name = ? WHERE cat_id = ?', [updatedCategory, id], (err, results) => {
            if (err) {
                console.log(err);
                return res.status(500).send("Server error");
            }
            return res.status(200).json({ id, category: updatedCategory });
        });
    });
};

const deleteProduct = async (req, res) => {
    const { id } = req.query;
    console.log(`received id: ${id}`);
    if (!id) {
        return res.status(400).send("Product id is required");
    }
    const query = `DELETE FROM jeweltest.product WHERE product_id = ?`;
    db.query(query, [id], (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Server error");
        }
        return res.status(200).json({ id });
    });
};

const updateVariant = async (req, res) => {
    const { id, name, price, stock, size, material } = req.body;
    console.log(`received data id: ${id}, name: ${name}, price: ${price}, stock: ${stock}, size: ${size}, material: ${material}`);
    if (!id) {
        return res.status(400).send("Variant id is required");
    }
    db.query('SELECT variant_name FROM jeweltest.variant WHERE variant_id = ?', [id], (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Server error");
        }
        if (results.length === 0) {
            return res.status(404).send("Variant not found");
        }
        const oldName = results[0].variant_name;
        const updatedName = name || oldName;

        db.query('UPDATE variant SET variant_name = ?, price = ?, stock = ?, size = ?, material = ? WHERE variant_id = ?', [updatedName, price, stock, size, material, id], (err, results) => {
            if (err) {
                console.log(err);
                return res.status(500).send("Server error");
            }
            return res.status(200).json({ id, name: updatedName, price, stock, size, material });
        });
    });
};

const deleteVariant = async (req, res) => {
    const { id } = req.query;
    console.log(`received id: ${id}`);
    if (!id) {
        return res.status(400).send("Variant id is required");
    }
    const query = `DELETE FROM jeweltest.variant WHERE variant_id = ?`;
    db.query(query, [id], (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Server error");
        }
        return res.status(200).json({ id });
    });
};

module.exports = {
    products,
    productVariants,
    addProduct,
    updateProduct,
    deleteProduct,
    updateVariant,
    deleteVariant
};