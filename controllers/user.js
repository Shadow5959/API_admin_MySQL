const db = require('../database.js');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { AppError } = require('../utils/errorHandler');

const register = async (req, res, next) => {
  const { name, email, password, cpassword, phone: number, gender } = req.body;
  console.log(req.body);
  const phone = parseInt(number);
  console.log(`received data name: ${name}, email: ${email}, password: ${password}, cpassword: ${cpassword}, phone: ${phone}, gender: ${gender}`);

  if (!name || !password || !cpassword || !email || !phone || !gender) {
    return next(new AppError("Name, password, confirm password, email, gender, and phone are required", 400));
  }

  if (password !== cpassword) {
    return next(new AppError("Passwords do not match", 400));
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return next(new AppError("Invalid email format", 400));
  }

  if (isNaN(phone) || phone.toString().length < 10) {
    return next(new AppError("Invalid phone number", 400));
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.query(
      'SELECT user_email, user_number FROM jeweltest.users WHERE user_email = ? AND user_number = ?',
      [email, phone],
      async (err, results) => {
        if (err) {
          return next(new AppError("Database error while checking existing user", 500));
        }
        if (results.length > 0) {
          return next(new AppError("User already in use", 409));
        }

        const createdAt = new Date();
        db.query(
          'INSERT INTO users SET ?',
          {
            user_name: name,
            user_email: email,
            user_password: hashedPassword,
            user_number: phone,
            created_at: createdAt,
            user_gender: gender
          },
          (err, results) => {
            if (err) {
              return next(new AppError("Database error while registering user", 500));
            }
            const userId = results.insertId;

            const token = jwt.sign(
              { id: userId },
              process.env.JWT_SECRET,
              { expiresIn: process.env.JWT_EXPIRES_IN }
            );
            console.log(`The token is: ${token}`);
            const cookieOptions = {
              expires: new Date(Date.now() + parseInt(process.env.JWT_COOKIE_EXPIRES) * 24 * 60 * 60 * 1000)
            };
            res.cookie('jwt', token, cookieOptions);

            db.query(
              'UPDATE users SET user_token = ? WHERE user_id = ?',
              [token, userId],
              (err) => {
                if (err) {
                  console.log(err);
                  // Even if token update fails, continue.
                }
                return res.status(201).json({ message: "User registered successfully", token });
              }
            );
          }
        );
      }
    );
  } catch (error) {
    console.error(error);
    return next(new AppError("Server error during registration", 500));
  }
};

const login = async (req, res, next) => {
  const { email, number, password } = req.body;
  console.log(`received data email: ${email}, number: ${number}, password: ${password}`);
  if ((!email && !number) || !password) {
    return next(new AppError("Either email or number, and password are required", 400));
  }
  const query = 'SELECT * FROM jeweltest.users WHERE (user_email = ? OR user_number = ?) AND active_user = 1 AND by_user = 1';
  db.query(query, [email || null, number || null], async (err, results) => {
    if (err) {
      return next(new AppError("Database error while fetching user", 500));
    }
    if (results.length === 0) {
      return next(new AppError("User not found", 404));
    }
    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.user_password);
    if (!isMatch) {
      return next(new AppError("Invalid credentials", 401));
    }
    const token = jwt.sign({ id: user.user_id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
    console.log(`The token is: ${token}`);
    const cookieOptions = {
      expires: new Date(Date.now() + parseInt(process.env.JWT_COOKIE_EXPIRES) * 24 * 60 * 60 * 1000)
    };
    res.cookie('jwt', token, cookieOptions);
    db.query('UPDATE users SET user_token = ? WHERE user_id = ?', [token, user.user_id], (err) => {
      if (err) {
        return next(new AppError("Database error while updating user token", 500));
      }
      return res.status(200).json({ token, user });
    });
  });
};

const addAddress = async (req, res, next) => {
  const { id, address, city, state, country, pincode } = req.body;
  console.log(`received data id: ${id}, address: ${address}, city: ${city}, state: ${state}, country: ${country}, pincode: ${pincode}`);
  if (!id || !address) {
    return next(new AppError("User id and address are required", 400));
  }
  db.query('INSERT INTO useraddress SET ?', { user_id: id, address, city, state, country, pincode }, (err, results) => {
    if (err) {
      return next(new AppError("Database error while adding address", 500));
    }
    return res.status(200).json({ id, address });
  });
};

const userOrder = async (req, res, next) => {
  let { id, total_amount, status, currency, variant_id, quantity, address_id } = req.body;
  console.log(`received data id: ${id}, total_amount: ${total_amount}, address_id: ${address_id}, status: ${status}, currency: ${currency}, variant_id: ${variant_id}, quantity: ${quantity}`);
  if (!id || !total_amount || !status || !currency || !variant_id || !quantity) {
    return next(new AppError("Missing required fields for order", 400));
  }
  db.query('SELECT cur_id FROM jeweltest.currency WHERE cur_name = ?', [currency], (err, currencyResults) => {
    if (err) {
      return next(new AppError("Database error while fetching currency", 500));
    }
    if (currencyResults.length === 0) {
      return next(new AppError("Currency not found", 404));
    }
    const cur_id = currencyResults[0].cur_id;
    db.query('SELECT price, stock FROM jeweltest.variant WHERE variant_id = ?', [variant_id], (err, variantResults) => {
      if (err) {
        return next(new AppError("Database error while fetching variant", 500));
      }
      if (variantResults.length === 0) {
        return next(new AppError("Variant not found", 404));
      }
      const { price, stock } = variantResults[0];
      if (stock < quantity) {
        return next(new AppError("Insufficient stock", 400));
      }
      const orderDate = new Date();
      const totalamount = price * quantity;
      db.query('INSERT INTO orders SET ?', { user_id: id, totalamount, order_date: orderDate, order_address_id: address_id, status, cur_id }, (err, orderResults) => {
        if (err) {
          return next(new AppError("Database error while creating order", 500));
        }
        const orderId = orderResults.insertId;
        db.query('INSERT INTO orderitems SET ?', { order_id: orderId, variant_id, quantity, price }, (err) => {
          if (err) {
            return next(new AppError("Database error while adding order items", 500));
          }
          db.query('UPDATE jeweltest.variant SET stock = stock - ? WHERE variant_id = ?', [quantity, variant_id], (err) => {
            if (err) {
              return next(new AppError("Database error while updating stock", 500));
            }
            return res.status(200).json({ id, total_amount, status, currency, variant_id, quantity, price });
          });
        });
      });
    });
  });
};

const user = async (req, res, next) => {
  const { email } = req.query;
  console.log(`received email: ${email}`);
  if (!email) {
    return next(new AppError("Email is required", 400));
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
      return next(new AppError("Database error while fetching user", 500));
    }
    if (results.length === 0) {
      return next(new AppError("User not found", 404));
    }
    const user = results[0];
    return res.status(200).json(user);
  });
};

const logout = async (req, res, next) => {
  res.clearCookie('jwt');
  return res.status(200).json({ message: "Logged out" });
};

const address = async (req, res, next) => {
  const { id } = req.query;
  console.log(`received id: ${id}`);
  if (!id) {
    return next(new AppError("User id is required", 400));
  }
  const query = 'SELECT * FROM jeweltest.useraddress WHERE user_id = ? and address_active = 1';
  db.query(query, [id], (err, results) => {
    if (err) {
      return next(new AppError("Database error while fetching addresses", 500));
    }
    if (!results || results.length === 0) {
      return next(new AppError("No addresses found for this user", 404));
    }
    return res.status(200).json(results);
  });
};

const userOrders = async (req, res, next) => {
  const { id } = req.query;
  console.log(`received id: ${id}`);
  if (!id) {
    return next(new AppError("User id is required", 400));
  }
  const userQuery = 'SELECT user_name, user_email, user_number FROM jeweltest.users WHERE user_id = ?';
  db.query(userQuery, [id], (err, userResults) => {
    if (err) {
      return next(new AppError("Database error while fetching user", 500));
    }
    if (userResults.length === 0) {
      return next(new AppError("User not found", 404));
    }
    const user = userResults[0];
    const orderQuery = `
        SELECT o.order_id, o.order_date, o.total_amount, o.status, o.status_label as status, c.cur_name
        FROM jeweltest.orders o
        LEFT JOIN jeweltest.currency c ON o.cur_id = c.cur_id
        WHERE o.user_id = ?
    `;
    db.query(orderQuery, [id], (err, orderResults) => {
      if (err) {
        return next(new AppError("Database error while fetching orders", 500));
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
          return next(new AppError("Database error while fetching order items", 500));
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

const updateAddress = async (req, res, next) => {
  const { address_id, id, address, city, state, country, pincode } = req.body;
  console.log(`received data id: ${id}, address: ${address}, city: ${city}, state: ${state}, country: ${country}, pincode: ${pincode}`);
  if (!id || !address || !address_id || !city || !state || !country || !pincode) {
    return next(new AppError("User id, address, city, state, country, and pincode are required", 400));
  }
  db.query('UPDATE useraddress SET address = ?, city = ?, state = ?, country = ?, pincode = ? WHERE user_id = ? AND address_id = ? AND address_active = 1', [address, city, state, country, pincode, id, address_id], (err, results) => {
    if (err) {
      return next(new AppError("Database error while updating address", 500));
    }
    return res.status(200).json({ id, address });
  });
};

const deleteAddress = async (req, res, next) => {
  const { id, address_id } = req.query;
  console.log(`received id: ${id}, address_id: ${address_id}`);
  if (!id || !address_id) {
    return next(new AppError("User id and address id are required", 400));
  }
  db.query('UPDATE useraddress SET address_active = 0 WHERE user_id = ? AND address_id = ?', [id, address_id], (err, results) => {
    if (err) {
      return next(new AppError("Database error while deleting address", 500));
    }
    return res.status(200).json({ id, address_id });
  });
};

const updateUser = async (req, res, next) => {
  const { name, gender, email } = req.body;
  const { id } = req.query;
  console.log(`received data id: ${id}, name: ${name}, gender: ${gender}`);
  if (!id) {
    return next(new AppError("User id is required", 400));
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return next(new AppError("Invalid email format", 400));
  }
  const query = 'SELECT user_name, user_gender, user_email FROM jeweltest.users WHERE user_id = ?';
  db.query(query, [id], (err, results) => {
    if (err) {
      return next(new AppError("Database error while fetching user", 500));
    }
    if (results.length === 0) {
      return next(new AppError("User not found", 404));
    }
    const user = results[0];
    const updatedName = name || user.user_name;
    const updatedGender = gender || user.user_gender;
    const updatedEmail = email || user.user_email;

    db.query('SELECT user_email FROM jeweltest.users WHERE user_email = ?', [updatedEmail], (err, emailResults) => {
      if (err) {
        return next(new AppError("Database error while checking email", 500));
      }
      if (emailResults.length > 0) {
        return next(new AppError("Email already in use", 409));
      }
    });

    const updateQuery = 'UPDATE jeweltest.users SET user_name = ?, user_gender = ?, user_email = ? WHERE user_id = ?';
    db.query(updateQuery, [updatedName, updatedGender, updatedEmail, id], (err) => {
      if (err) {
        return next(new AppError("Database error while updating user", 500));
      }
      return res.status(200).json({ id, name: updatedName, gender: updatedGender });
    });
  });
};

const updateOrder = async (req, res, next) => {
  const { id, status, order_id } = req.body;
  console.log(`Received data user_id: ${id}, status: ${status}, order_id: ${order_id}`);

  if (!id || !status || !order_id) {
    return next(new AppError("User id, order id, and status are required", 400));
  }

  const validStatuses = ['pending', 'packing', 'intransit', 'canceled', 'returned', 'delivered'];
  if (!validStatuses.includes(status)) {
    return next(new AppError("Invalid status", 400));
  }

  const the_Status = status === 'pending' ? 0 :
                    status === 'packing' ? 1 :
                    status === 'intransit' ? 2 :
                    status === 'delivered' ? 3 :
                    status === 'canceled' ? 4 :
                    status === 'returned' ? 5 : 0;

  let order_completed_date = (the_Status === 3) ? new Date() : null;
  const theStatus = (the_Status).toString();

  db.query(
    'SELECT * FROM orders WHERE order_id = ? AND user_id = ?',
    [order_id, id],
    (err, results) => {
      if (err) {
        return next(new AppError("Database error while fetching order", 500));
      }
      if (results.length === 0) {
        return next(new AppError("Order not found or not authorized", 404));
      }
      
      db.query(
        'UPDATE orders SET status = ?, order_completed_date = ? WHERE order_id = ? AND user_id = ?',
        [theStatus, order_completed_date, order_id, id],
        (err, updateResults) => {
          if (err) {
            return next(new AppError("Database error while updating order", 500));
          }
          return res.status(200).json({ order_id, status, numericStatus: theStatus });
        }
      );
    }
  );
};

module.exports = { register, login, addAddress, userOrder, user, logout, address, userOrders, updateAddress, deleteAddress, updateUser, updateOrder };
