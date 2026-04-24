const { Router } = require('express');
const config = require('../config');

const router = Router();

const base = { port: config.port, nodeEnv: config.nodeEnv };

router.get('/', (req, res) => {
  res.render('index', { ...base, title: 'Paylov — Bosh sahifa', activePage: 'home' });
});

router.get('/cards', (req, res) => {
  res.render('cards', { ...base, title: 'Kartalar — Paylov', activePage: 'cards' });
});

router.get('/payments', (req, res) => {
  res.render('payments', { ...base, title: "To'lovlar — Paylov", activePage: 'payments' });
});

router.get('/payment-link', (req, res) => {
  res.render('payment-link', { ...base, title: "To'lov linki — Paylov", activePage: 'payment-link' });
});

module.exports = router;
