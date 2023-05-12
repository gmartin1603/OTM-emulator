const { initializeApp } = require('firebase-admin/app');
const admin = require('firebase-admin');
require('dotenv').config()
const serviceAccount = require("../private/overtime-management-83008-firebase-adminsdk-q8kc2-1956d61a57.json");

if (process.env.NODE_ENV == 'dev') {
  initializeApp()
} else {
  //Admin SDK init
  initializeApp({
    credentials: serviceAccount
  });
}

  const db = admin.firestore();
  module.exports = {db, admin};