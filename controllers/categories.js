const db = require('../database.js');

const categories = async (req, res) => {
    db.query('SELECT * FROM jeweltest.category', (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Server error");
        }
        return res.status(200).json(results);
    });
};

const addCategory = async (req, res) => {
    const { category} = req.body;
    console.log(`received data category: ${category}`);
    if (!category) {
        return res.status(400).send("Category is required");
    }
    db.query(`SELECT * FROM jeweltest.category WHERE cat_name = ?`, [category], (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Server error");
        }
        if (results.length > 0) {
            return res.status(400).send("Category already exists");
        }
        db.query('INSERT INTO category SET ?', { cat_name: category }, (err, results) => {
            if (err) {
                console.log(err);
                return res.status(500).send("Server error");
            }
            return res.status(200).json({ category });
        });
    });
};


const deleteCategory = async (req, res) => {
    const { id, name}  = req.query;
    console.log(`received id: ${id}, name: ${name}`);
    if ( !id || !name){
        return res.status(400).send("Category id and name is required");
    }
    query = `DELETE FROM jeweltest.category WHERE cat_id = ? AND cat_name = ?`;
    db.query(query, [id, name], (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Server error");
        }
        return res.status(200).json({ id, name });
    });
};

const subcategory = async (req, res) => {
    db.query('SELECT * FROM jeweltest.subcategory', (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Server error");
        }
        return res.status(200).json(results);
    });
};

const addSubcategory = async (req, res) => {
    const { subcategory, category } = req.body;
    console.log(`received data subcategory: ${subcategory}, category: ${category}`);
    if (!subcategory || !category) {
        return res.status(400).send("Subcategory and category are required");
    }
    db.query(`INSERT into subcategory SET ?`, { subcategory_name: subcategory, cat_id: category }, (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Server error");
        }
        return res.status(200).json({ subcategory, category });
    })
};

const updateSubcategory = async (req, res) => {
    const { id } = req.query;
    const { subcategory, category } = req.body;
    console.log(`received data id: ${id}, subcategory: ${subcategory}, category: ${category}`);
    if (!id) {
        return res.status(400).send("Subcategory id is required");
    }
    db.query('SELECT subcategory_name, cat_id FROM jeweltest.subcategory WHERE subcategory_id = ?', [id], (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Server error");
        }
        if (results.length === 0) {
            return res.status(404).send("Subcategory not found");
        }
        console.log(results);
        const oldSubcategory = results[0].subcategory_name;
        const updatedSubcategory = subcategory || oldSubcategory;
        const oldCategory = results[0].cat_id;
        const updatedCategory = category || oldCategory;

        db.query('UPDATE subcategory SET subcategory_name = ?, cat_id = ? WHERE subcategory_id = ?', [updatedSubcategory, updatedCategory, id], (err, results) => {
            if (err) {
                console.log(err);
                return res.status(500).send("Server error");
            }
            return res.status(200).json({ id, subcategory: updatedSubcategory,updatedCategory });
        });
    });
};

const deleteSubcategory = async (req, res) => {
    const { id } = req.query;
    console.log(`received id: ${id}`);
    if (!id) {
        return res.status(400).send("Subcategory id is required");
    }
    const query = `DELETE FROM jeweltest.subcategory WHERE subcategory_id = ?`;
    db.query(query, [id], (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Server error");
        }
        return res.status(200).json({ id });
    });
};

const types = async (req, res) => {
    db.query('SELECT * FROM jeweltest.producttype', (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Server error");
        }
        return res.status(200).json(results);
    });
};



module.exports = { categories, addCategory, deleteCategory, subcategory, addSubcategory, updateSubcategory, deleteSubcategory, types };

