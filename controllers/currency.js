const db = require('../database.js');

const addCurrency = async (req, res) => {
    const { currency } = req.body;
    console.log(`received data currency: ${currency}`);
    if (!currency) {
        return res.status(400).send("currency is required");
    }
    db.query(`SELECT * FROM jeweltest.currency WHERE cur_name = ?`, [currency], (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Server error");
        }
        if (results.length > 0) {
            return res.status(400).send("currency already exists");
        }
        db.query('INSERT INTO currency SET ?', { cur_name: currency }, (err, results) => {
            if (err) {
                console.log(err);
                return res.status(500).send("Server error");
            }
            return res.status(200).json({ currency });
        });
    });
};

const currency = async (req, res) => {
    db.query('SELECT * FROM jeweltest.currency', (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Server error");
        }
        return res.status(200).json(results);
    });
};

const updateCurrency = async (req, res) => {
    const {id} = req.query;
    const { currency } = req.body;
    console.log(`received data id: ${id}, currency: ${currency}`);
    if (!id) {
        return res.status(400).send("currency id is required");
    }
    db.query('SELECT cur_name FROM jeweltest.currency WHERE cur_id = ?', [id], (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Server error");
        }
        if (results.length === 0) {
            return res.status(404).send("currency not found");
        }
        const oldcurrency = results[0].cur_name;
        const updatedcurrency = currency || oldcurrency;

        db.query('UPDATE currency SET cur_name = ? WHERE cur_id = ?', [updatedcurrency, id], (err, results) => {
            if (err) {
                console.log(err);
                return res.status(500).send("Server error");
            }
            return res.status(200).json({ id, currency: updatedcurrency });
        });
    });
};

const deleteCurrency = async (req, res) => {
    const { id, name}  = req.query;
    console.log(`received id: ${id}, name: ${name}`);
    if ( !id || !name){
        return res.status(400).send("currency id and name is required");
    }
    query = `DELETE FROM jeweltest.currency WHERE cur_id = ? AND cur_name = ?`;
    db.query(query, [id, name], (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Server error");
        }
        return res.status(200).json({ id, name });
    });
};

module.exports = { currency, addCurrency, updateCurrency, deleteCurrency };