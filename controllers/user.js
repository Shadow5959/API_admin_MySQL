const db = require('../database.js');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');


const register = async (req, res) => {
    const { name, email, password, cpassword, phone: number, address } = req.body;
    console.log(req.body);
    const phone = parseInt(number);
    console.log(`received data name: ${name}, email: ${email}, password: ${password}, cpassword: ${cpassword}, phone: ${phone}, address: ${address}`);

    if (!name || !password || !cpassword || !email || !phone) {
        return res.status(400).send("Name, password, confirm password, email, and phone are required");
    }

    if (password !== cpassword) {
        return res.status(400).send("Passwords do not match");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).send("Invalid email format");
    }

    if (isNaN(phone) || phone.toString().length < 10) {
        return res.status(400).send("Invalid phone number");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    db.query('SELECT user_email, user_number FROM jeweltest.users WHERE user_email = ? AND user_number = ?', [email, phone], async (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Server error");
        }
        if (results.length > 0) {
            const existingUser = results[0];
            if (existingUser.user_email === email && existingUser.user_number === phone) {
                return res.status(400).send("User already in use");
            }
        }
        const createdAt = new Date();
        db.query('INSERT INTO users SET ?', { user_name: name, user_email: email, user_password: hashedPassword, user_number: phone, created_at: createdAt }, (err, results) => {
            if (err) {
                console.log(err);
                return res.status(500).send("Server error");
            } else {
                const userId = results.insertId;
                if (address) {
                    db.query('INSERT INTO useraddress SET ?', { user_id: userId, address: address }, (err, results) => {
                        if (err) {
                            console.log(err);
                            return res.status(500).send("Server error");
                        } else {
                            return res.status(200).json({ email: email, name: name, phone: phone, address: address });
                        }
                    });
                } else {
                    return res.status(200).json({ email: email, name: name, phone: phone });
                }
            }
        });
    });
};

const login = async (req, res) => {
    const { email, number, password } = req.body;
    console.log(`received data email: ${email}, number: ${number}, password: ${password}`);
    if ((!email && !number) || !password) {
        return res.status(400).send("Either email or number, and password are required");
    }
    const query = 'SELECT * FROM jeweltest.users WHERE (user_email = ? OR user_number = ?) AND active_user = 1 AND by_user = 1';
    db.query(query, [email || null, number || null], async (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Server error");
        }
        if (results.length === 0) {
            return res.status(404).send("User not found");
        }
        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.user_password);
        if (!isMatch) {
            return res.status(400).send("Invalid credentials");
        }
        const token = jwt.sign({ id: user.user_id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
        console.log(`The token is: ${token}`);
        const cookieOptions = {
            expires: new Date(Date.now() + parseInt(process.env.JWT_COOKIE_EXPIRES) * 24 * 60 * 60 * 1000)
        };
        res.cookie('jwt', token, cookieOptions);
        return res.status(200).json({ token, user });
    });
};

const addAddress = async (req, res) => {
    const { id, address } = req.body;
    console.log(`received data id: ${id}, address: ${address}`);
    if (!id || !address) {
        return res.status(400).send("User id and address are required");
    }
    db.query('INSERT INTO useraddress SET ?', { user_id: id, address: address }, (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Server error");
        }
        return res.status(200).json({ id, address });
    });
};

const userOrder = async (req, res) => {
    let { id, total_amount, status, currency, variant_id, quantity } = req.body;
    console.log(`received data id: ${id}, total_amount: ${total_amount}, status: ${status}, currency: ${currency}, variant_id: ${variant_id}, quantity: ${quantity}`);
    if (!id || !total_amount || !status || !currency || !variant_id || !quantity) {
        return res.status(400).send("User id, total amount, status, currency, variant id, and quantity are required");
    }
    db.query('SELECT cur_id FROM jeweltest.currency WHERE cur_name = ?', [currency], (err, currencyResults) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Server error");
        }
        if (currencyResults.length === 0) {
            return res.status(404).send("Currency not found");
        }
        const cur_id = currencyResults[0].cur_id;
        db.query('SELECT price FROM jeweltest.variant WHERE variant_id = ?', [variant_id], (err, variantResults) => {
            if (err) {
                console.log(err);
                return res.status(500).send("Server error");
            }
            if (variantResults.length === 0) {
                return res.status(404).send("Variant not found");
            }
            const price = variantResults[0].price;
            const orderDate = new Date();
            db.query('INSERT INTO orders SET ?', { user_id: id, total_amount, order_date: orderDate,status, cur_id }, (err, orderResults) => {
                if (err) {
                    console.log(err);
                    return res.status(500).send("Server error");
                }
                const orderId = orderResults.insertId;
                db.query('INSERT INTO orderitems SET ?', { order_id: orderId, variant_id, quantity, price }, (err) => {
                    if (err) {
                        console.log(err);
                        return res.status(500).send("Server error");
                    }
                    return res.status(200).json({ id, total_amount, status, currency, variant_id, quantity, price });
                });
            });
        });
    });
};

const user = async (req, res) => {
    const { email } = req.query;
    console.log(`received email: ${email}`);
    if (!email) {
        return res.status(400).send("Email is required");
    }
    const query = `
        SELECT u.user_name, u.user_email, u.user_number, u.user_gender, GROUP_CONCAT(ua.address) as user_addresses, u.user_verify, u.user_id 
        FROM jeweltest.users u
        LEFT JOIN jeweltest.useraddress ua ON u.user_id = ua.user_id
        WHERE u.user_email = ? AND u.active_user = 1 AND u.by_user = 1
        GROUP BY u.user_id
    `;
    db.query(query, [email], (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Server error");
        }
        console.log(results);
        if (results.length === 0) {
            return res.status(404).send("User not found");
        }
        const user = results[0];
        return res.status(200).json(user);
    });
};

const logout = async (req, res) => {
    res.clearCookie('jwt');
    return res.status(200).send("Logged out");
};

const address = async (req, res) => {
    const { id } = req.query;
    console.log(`received id: ${id}`);
    if (!id) {
        return res.status(400).send("User id is required");
    }
    const query = 'SELECT * FROM jeweltest.useraddress WHERE user_id = ? and address_active = 1';
    db.query(query, [id], (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Server error");
        }
        return res.status(200).json(results);
    });
};

const userOrders = async (req, res) => {
    const { id } = req.query;
    console.log(`received id: ${id}`);
    if (!id) {
        return res.status(400).send("User id is required");
    }
    const userQuery = 'SELECT user_name, user_email, user_number FROM jeweltest.users WHERE user_id = ?';
    db.query(userQuery, [id], (err, userResults) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Server error");
        }
        if (userResults.length === 0) {
            return res.status(404).send("User not found");
        }
        const user = userResults[0];
        const orderQuery = `
            SELECT o.order_id, o.order_date, o.total_amount, o.status, c.cur_name
            FROM jeweltest.orders o
            LEFT JOIN jeweltest.currency c ON o.cur_id = c.cur_id
            WHERE o.user_id = ?
        `;
        db.query(orderQuery, [id], (err, orderResults) => {
            if (err) {
                console.log(err);
                return res.status(500).send("Server error");
            }
            const orderIds = orderResults.map(order => order.order_id);
            if (orderIds.length === 0) {
                return res.status(200).json({ user, orders: [] });
            }
            const itemsQuery = `
                SELECT oi.order_id, oi.variant_id, v.variant_name, oi.quantity, oi.price
                FROM jeweltest.orderitems oi
                LEFT JOIN jeweltest.variant v ON oi.variant_id = v.variant_id
                WHERE oi.order_id IN (?)
            `;
            db.query(itemsQuery, [orderIds], (err, itemsResults) => {
                if (err) {
                    console.log(err);
                    return res.status(500).send("Server error");
                }
                const ordersWithItems = orderResults.map(order => {
                    const items = itemsResults.filter(item => item.order_id === order.order_id);
                    return { ...order, items };
                });
                return res.status(200).json({ user, orders: ordersWithItems });
            });
        });
    });
};

const updateAddress = async (req, res) => {
    const { address_id, id, address } = req.body;
    console.log(`received data id: ${id}, address: ${address}`);
    if (!id || !address || !address_id) {
        return res.status(400).send("User id and address are required");
    }
    db.query('UPDATE useraddress SET address = ? WHERE user_id = ? AND address_id = ? AND address_active = 1', [address, id, address_id], (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Server error");
        }
        return res.status(200).json({ id, address });
    });
};

const deleteAddress = async (req, res) => {
    const { id, address_id } = req.query;
    console.log(`received id: ${id}, address_id: ${address_id}`);
    if (!id || !address_id) {
        return res.status(400).send("User id and address id are required");
    }
    db.query('UPDATE useraddress SET address_active = 0 WHERE user_id = ? AND address_id = ?', [id, address_id], (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Server error");
        }
        return res.status(200).json({ id, address_id });
    });
};

const updateUser = async (req, res) => {
    const { name, gender } = req.body;
    const { id } = req.query;
    console.log(`received data id: ${id}, name: ${name}, gender: ${gender}`);
    if (!id) {
        return res.status(400).send("User id is required");
    }

    const query = 'SELECT user_name, user_gender FROM jeweltest.users WHERE user_id = ?';
    db.query(query, [id], (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Server error");
        }
        if (results.length === 0) {
            return res.status(404).send("User not found");
        }
        const user = results[0];
        const updatedName = name || user.user_name;
        const updatedGender = gender || user.user_gender;

        const updateQuery = 'UPDATE jeweltest.users SET user_name = ?, user_gender = ? WHERE user_id = ?';
        db.query(updateQuery, [updatedName, updatedGender, id], (err, results) => {
            if (err) {
                console.log(err);
                return res.status(500).send("Server error");
            }
            return res.status(200).json({ id, name: updatedName, gender: updatedGender });
        });
    });
};

const updateOrder = async (req, res) => {
    const { id, status } = req.body;
    console.log(`received data id: ${id}, status: ${status}`);
    if (!id || !status) {
        return res.status(400).send("Order id and status are required");
    }
    if (!['pending', 'delivered'].includes(status)) {
        return res.status(400).send("Invalid status");
    }
    const theStatus = status === 'delivered' ? 1 : 0;
    if (theStatus === 1) {
        order_completed_date = new Date();
    } else {
        order_completed_date = null;
    }
    db.query('UPDATE orders SET status = ?, order_completed_date = ? WHERE order_id = ?', [theStatus, order_completed_date, id], (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Server error");
        }
        return res.status(200).json({ id, status });
    });
};

module.exports = { register, login, addAddress, userOrder, user, logout, address, userOrders, updateAddress, deleteAddress, updateUser, updateOrder };