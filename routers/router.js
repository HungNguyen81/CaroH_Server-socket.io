const express = require('express');
const app = express();
const router = express.Router();

router.get('/', async function (req, res) {
   await res.render('index');
});

module.exports = router;