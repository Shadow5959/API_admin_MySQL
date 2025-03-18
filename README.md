# JewelTest - Node.js Application

## Description

JewelTest is a Node.js-based web application designed to manage users, products, categories, and currencies. It provides a robust backend API with features like user authentication, product management, and logging. The application is built with scalability and maintainability in mind, making it suitable for small to medium-sized e-commerce platforms or as a starting point for larger projects.

---

## Table of Contents

- [Features](#features)
- [Use Cases](#use-cases)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Usage](#usage)
- [Environment Variables](#environment-variables)
- [Scripts](#scripts)
- [Technologies Used](#technologies-used)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- **User Authentication**: Secure login and registration using JWT (JSON Web Tokens).
- **Product Management**: APIs to create, update, delete, and fetch products.
- **Category Management**: Manage product categories for better organization.
- **Currency Management**: Handle multiple currencies for product pricing.
- **Static File Serving**: Serve static assets like images from the `public` directory.
- **Logging**: Detailed request logging using `morgan` and custom loggers.
- **Error Handling**: Centralized error handling for consistent API responses.
- **Environment Configuration**: Use `.env` files for secure configuration.

---

## Use Cases

1. **E-commerce Backend**:
   - Manage users, products, and categories.
   - Serve product images and other static assets.
   - Handle user authentication and authorization.

2. **API for Mobile or Web Applications**:
   - Provide a backend API for mobile or web apps to interact with product and user data.

3. **Learning Project**:
   - A great starting point for developers learning Node.js, Express, and backend development.

---

## Project Structure

```
.env
.gitignore
app.log
database.js
index.js
package.json
server.js
controllers/
    categories.js
    currency.js
    products.js
    user.js
dummyData/
    .env
    addData.js
    dummydata.js
    dummydata.json
    user_passwords.json
middlewares/
    auth.js
public/
    images/
routes/
    products.js
    user.js
service/
    auth.js
utils/
    errorHandler.js
    logger.js
```

- **controllers/**: Contains logic for handling requests for categories, products, users, and currencies.
- **dummyData/**: Includes dummy data and scripts for populating the database.
- **middlewares/**: Contains middleware for authentication and other reusable logic.
- **public/**: Static assets like images.
- **routes/**: Defines API routes for products and users.
- **service/**: Contains reusable service logic, such as authentication.
- **utils/**: Utility functions for error handling and logging.

---

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd <repository-folder>
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up the environment variables:
   - Copy the `.env` file from `dummyData/.env` to the root directory.
   - Update the variables as needed.

---

## Usage

1. Start the server:
   ```bash
   npm start
   ```

2. Access the API at:
   ```
   http://localhost:<PORT>
   ```

3. Use tools like Postman or cURL to interact with the API.

---

## Environment Variables

The following environment variables are required:

- `PORT`: The port on which the server will run.
- `DB_URL`: The database connection string.
- `JWT`: Secret key for JWT authentication.

---

## Scripts

- **Start the server**:
  ```bash
  npm start
  ```

- **Run in development mode**:
  ```bash
  npm run dev
  ```

- **Run tests** (if applicable):
  ```bash
  npm test
  ```

---

## Technologies Used

- **Node.js**: Backend runtime environment.
- **Express.js**: Web framework for building APIs.
- **EJS**: Template engine for rendering views.
- **Morgan**: HTTP request logger middleware.
- **dotenv**: Environment variable management.
- **body-parser**: Middleware for parsing request bodies.
- **cookie-parser**: Middleware for parsing cookies.

---

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a new branch:
   ```bash
   git checkout -b feature-name
   ```
3. Commit your changes:
   ```bash
   git commit -m "Add feature-name"
   ```
4. Push to your branch:
   ```bash
   git push origin feature-name
   ```
5. Open a pull request.

---

