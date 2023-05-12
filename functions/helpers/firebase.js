const { initializeApp } = require('firebase-admin/app');
const admin = require('firebase-admin');

//Admin SDK init (comment out for local emulator)
// const serviceAccount = require("../private/overtime-management-83008-firebase-adminsdk-q8kc2-1956d61a57.json");
initializeApp(
    // {
    //   credentials: serviceAccount
    // }
  );

  const db = admin.firestore();
  module.exports = {db, admin};