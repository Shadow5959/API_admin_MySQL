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
  const { name, description, category, type, subcategory, variants_count } = req.body;
  
  if (!name || !category || !type || !subcategory || !variants_count) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Build variants array by reading each variant's fields from req.body
  const count = parseInt(variants_count, 10);
  if (isNaN(count) || count < 1) {
    return res.status(400).json({ error: "Invalid variants_count" });
  }

  const variantsArray = [];
  for (let i = 0; i < count; i++) {
    const variant = {
      variant_name: req.body[`variant_${i}_variant_name`],
      price: req.body[`variant_${i}_price`],
      stock: req.body[`variant_${i}_stock`],
      size: req.body[`variant_${i}_size`],
      material: req.body[`variant_${i}_material`],
    };

    // Validate each variant
    if (!variant.variant_name || !variant.price || !variant.stock || !variant.size || !variant.material) {
      return res.status(400).json({ error: `Missing required variant fields for variant ${i}` });
    }
    variantsArray.push(variant);
  }

  // Process files from req.files:
  let productCoverFile = req.files.find(file => file.fieldname === 'product_cover');
  
  // Group variant images using field names like 'variant_images_0', 'variant_images_1', etc.
  const variantImagesMap = {}; // key: variant index, value: array of files
  req.files.forEach(file => {
    if (file.fieldname.startsWith('variant_images_')) {
      const index = file.fieldname.split('variant_images_')[1]; // get the index as string
      if (!variantImagesMap[index]) {
        variantImagesMap[index] = [];
      }
      variantImagesMap[index].push(file);
    }
  });

  // At this point:
  // - productCoverFile contains the product cover image (if provided)
  // - variantImagesMap holds the images for each variant by index

  // Continue with your DB logic...
  // Example: Insert product, then variants, and then use the variantImagesMap to insert images

  db.getConnection((err, connection) => {
    if (err) return res.status(500).json({ error: "Server error getting connection" });

    connection.beginTransaction(err => {
      if (err) {
        connection.release();
        return res.status(500).json({ error: "Server error starting transaction" });
      }

      const productData = {
        product_name: name,
        product_desc: description,
        cat_id: category,
        type_id: type,
        subcategory_id: subcategory,
        product_cover: productCoverFile ? productCoverFile.filename : null,
        created_at: new Date()
      };

      connection.query('INSERT INTO product SET ?', productData, (err, productResults) => {
        if (err) {
          connection.rollback(() => {
            connection.release();
            return res.status(500).json({ error: "Server error inserting product" });
          });
        }

        const productId = productResults.insertId;
        const variantQuery = `
          INSERT INTO variant 
          (variant_name, product_id, product_name, price, stock, size, material)
          VALUES ?`;
        const variantValues = variantsArray.map(variant => [
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

          // Bulk insert variant images if provided
          const imageQuery = 'INSERT INTO productimages (variant_id, image_url) VALUES ?';
          const variantImages = [];

          variantsArray.forEach((variant, index) => {
            // Calculate variant ID assuming sequential insertion
            const variantId = variantResult.insertId + index;
            if (variantImagesMap[index]) {
              let images = variantImagesMap[index];
              // Limit to a maximum of 4 images per variant
              images = images.slice(0, 4);
              images.forEach(image => {
                variantImages.push([variantId, image.filename]);
              });
            }
          });

          if (variantImages.length > 0) {
            connection.query(imageQuery, [variantImages], (err) => {
              if (err) {
                connection.rollback(() => {
                  connection.release();
                  return res.status(500).json({ error: "Failed to insert variant images" });
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
                  message: "Product, variants, and images added successfully",
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
      });
    });
  });
};


const updateProduct = async (req, res) => {
  let connection;
  try {
    // Get product id from query (e.g., /updateProduct?id=37)
    const productId = req.query.id;
    if (!productId) {
      return res.status(400).json({ error: "Product id is required" });
    }

    // Extract product fields from req.body
    // (If a field is not provided, we want to use the existing value.)
    const { product_name, product_desc, category, type, subcategory, variants } = req.body;
    
    // Get a DB connection and start a transaction
    connection = await db.promise().getConnection();
    await connection.beginTransaction();

    // Use an empty array if no files were uploaded
    const files = req.files || [];

    // First, fetch the current product record
    const [currentProducts] = await connection.query(
      'SELECT * FROM product WHERE product_id = ?',
      [productId]
    );
    if (currentProducts.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ error: "Product not found" });
    }
    const currentProduct = currentProducts[0];

    // Get new product cover file if provided (field name: "product_cover")
    const productCoverFile = files.find(file => file.fieldname === 'product_cover');

    // Build the product update data using provided values or existing values if not provided
    const productUpdateData = {
      product_name: product_name !== undefined ? product_name : currentProduct.product_name,
      product_desc: product_desc !== undefined ? product_desc : currentProduct.product_desc,
      cat_id: category !== undefined ? category : currentProduct.cat_id,
      type_id: type !== undefined ? type : currentProduct.type_id,
      subcategory_id: subcategory !== undefined ? subcategory : currentProduct.subcategory_id,
      updated_at: new Date()
    };
    if (productCoverFile) {
      productUpdateData.product_cover = productCoverFile.filename;
    }

    // Update the product record
    await connection.query('UPDATE product SET ? WHERE product_id = ?', [
      productUpdateData,
      productId
    ]);

    // Parse the variants JSON string.
    // This should be an array of variant objects.
    let parsedVariants = [];
    if (variants) {
      try {
        parsedVariants = JSON.parse(variants);
      } catch (e) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({ error: "Invalid variants JSON" });
      }
    }

    // --- Process Existing Variants (Update) ---
    // For each variant that includes an existing variant_id, update its data
    for (let i = 0; i < parsedVariants.length; i++) {
      const variant = parsedVariants[i];
      if (variant.variant_id) {
        // Update the variant record
        const updateVariantData = {
          variant_name: variant.variant_name,
          price: variant.price,
          stock: variant.stock,
          size: variant.size,
          material: variant.material
        };
        await connection.query('UPDATE variant SET ? WHERE variant_id = ?', [
          updateVariantData,
          variant.variant_id
        ]);

        // If new images for this variant are provided,
        // files for an existing variant must be sent with field name: variant_images_<variant_id>
        const variantImagesFiles = files.filter(file => file.fieldname === `variant_images_${variant.variant_id}`);
        if (variantImagesFiles.length > 0) {
          // Optionally, delete existing images first
          await connection.query('DELETE FROM productimages WHERE variant_id = ?', [variant.variant_id]);

          // Limit to a maximum of 4 images per variant
          const limitedFiles = variantImagesFiles.slice(0, 4);
          const imagesValues = limitedFiles.map(file => [variant.variant_id, file.filename]);
          if (imagesValues.length > 0) {
            await connection.query(
              'INSERT INTO productimages (variant_id, image_url) VALUES ?',
              [imagesValues]
            );
          }
        }
      }
    }

    // --- Process New Variants (Insert) ---
    // For each variant object that does not include a variant_id, insert it as a new variant
    for (let i = 0; i < parsedVariants.length; i++) {
      const variant = parsedVariants[i];
      if (!variant.variant_id) {
        // Insert new variant record
        const insertVariantData = {
          variant_name: variant.variant_name,
          product_id: productId,
          product_name: productUpdateData.product_name, // Use updated product name
          price: variant.price,
          stock: variant.stock,
          size: variant.size,
          material: variant.material
        };
        const [result] = await connection.query('INSERT INTO variant SET ?', [insertVariantData]);
        const newVariantId = result.insertId;

        // For new variants, images are expected with field name: variant_images_new_<index>
        // where the index corresponds to the position in the JSON array for new variants.
        const newVariantImagesFiles = files.filter(file => file.fieldname === `variant_images_new_${i}`);
        if (newVariantImagesFiles.length > 0) {
          const limitedFiles = newVariantImagesFiles.slice(0, 4);
          const imagesValues = limitedFiles.map(file => [newVariantId, file.filename]);
          if (imagesValues.length > 0) {
            await connection.query(
              'INSERT INTO productimages (variant_id, image_url) VALUES ?',
              [imagesValues]
            );
          }
        }
      }
    }

    // Commit transaction and release connection
    await connection.commit();
    connection.release();
    return res.status(200).json({ message: 'Product, variants, and images updated successfully' });
  } catch (error) {
    console.error(error);
    if (connection) {
      await connection.rollback();
      connection.release();
    }
    return res.status(500).json({ error: 'Server error' });
  }
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