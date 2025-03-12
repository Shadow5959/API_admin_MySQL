const express = require('express');
const router = express.Router();
const { products, productVariants, addProduct, updateProduct, deleteProduct, updateVariant, deleteVariant } = require('../controllers/products');
const { categories, addCategory, deleteCategory, subcategory, addSubcategory, updateSubcategory, deleteSubcategory, types } = require('../controllers/categories');
const { currency, addCurrency, updateCurrency, deleteCurrency } = require('../controllers/currency');


const fs = require('fs');
const multer = require('multer');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        return cb(null, './public/images')
    },
    filename: function (req, file, cb) {
       return cb(null, `${Date.now()}-${file.originalname}`)
    },
});
const upload = multer({ storage: storage});








router.get('/products', products);
router.get('/categories', categories);
router.get('/currency', currency);
router.get('/productvariants', productVariants);
router.get('/subcategory', subcategory);
router.get('/types', types);


router.post('/addProduct', upload.fields([
    { name: 'images', maxCount: 10 },
    { name: 'variantcover', maxCount: 1 }
]), addProduct);
router.post('/addcategory', addCategory);
router.post('/addcurrency', addCurrency);
router.post('/addsucategory', addSubcategory);

router.put('/updateproduct', updateProduct);
router.put('/updatecurrency', updateCurrency);
router.put('/updatesubcategory', updateSubcategory);
router.put('/updatevariant', updateVariant);

router.delete('/deleteproduct', deleteProduct);
router.delete('/deletecategory', deleteCategory);
router.delete('/deletecurrency', deleteCurrency);
router.delete('/deletesubcategory', deleteSubcategory);
router.delete('/deletevariant', deleteVariant);

module.exports = router;

