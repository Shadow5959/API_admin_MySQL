const express = require('express');
const router = express.Router();
const { products, productVariants, addProduct, updateProduct, deleteProduct, updateVariant, deleteVariant } = require('../controllers/products');
const { categories, addCategory, deleteCategory, subcategory, addSubcategory, updateSubcategory, deleteSubcategory, types } = require('../controllers/categories');
const { currency, addCurrency, updateCurrency, deleteCurrency } = require('../controllers/currency');
const cacheMiddleware = require('../middlewares/cacheMiddleware');
const fs = require('fs');
const multer = require('multer');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/images');
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage: storage }).any();









router.get('/products',cacheMiddleware, products);
router.get('/categories', cacheMiddleware,categories);
router.get('/currency', cacheMiddleware, currency);
router.get('/productvariants', cacheMiddleware,productVariants);
router.get('/subcategory', cacheMiddleware,subcategory);
router.get('/types', cacheMiddleware,types);


router.post('/addProduct', upload, addProduct);
router.post('/addcategory', addCategory);
router.post('/addcurrency', addCurrency);
router.post('/addsucategory', addSubcategory);

router.put('/updateproduct', upload, updateProduct);
router.put('/updatecurrency', updateCurrency);
router.put('/updatesubcategory', updateSubcategory);
router.put('/updatevariant', updateVariant);

router.delete('/deleteproduct', deleteProduct);
router.delete('/deletecategory', deleteCategory);
router.delete('/deletecurrency', deleteCurrency);
router.delete('/deletesubcategory', deleteSubcategory);
router.delete('/deletevariant', deleteVariant);

module.exports = router;

