const app = require('./server.js');
const db = require('./database.js');
const dotenv = require('dotenv');
dotenv.config();
const userRoutes = require('./routes/user.js');
const productRoutes = require('./routes/products.js');



app.use('/', userRoutes);
app.use('/', productRoutes);

   


    

  


   
    

app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});


