const express = require('express');
const router = express.Router();
const { register, login, user, logout, userOrder, address, addAddress, updateAddress, deleteAddress, updateUser, userOrders, updateOrder } = require('../controllers/user');


router.get('/user', user);
router.get('/logout', logout);
router.get('/address', address);
router.get('/userorders', userOrders);

router.post('/register', register);
router.post('/login', login);
router.post('/address', addAddress);
router.post('/userorder', userOrder);

router.put('/editaddress', updateAddress);
router.put('/deleteaddress', deleteAddress);
router.put('/updateuser', updateUser);
router.put('/updateorder', updateOrder); 


module.exports = router;