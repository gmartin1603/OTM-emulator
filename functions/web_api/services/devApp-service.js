/**
 * @module devApp-service
 * @requires firebase-admin/auth
 * @description This module provides the service for the "/devApp/*" routes 
 * @description devApp-service handles the business logic for /devApp endpoints
 * @description devApp-service is called by and returns to devApp-controller
 * @exports devAppService
 */
const { handlePromise, handleResponse } = require("./common-service");
// Firestore helpers (if needed)
// const { getAuth } = require("firebase-admin/auth");
// const { db, admin } = require("../../helpers/firebase");

const devAppService = {
  // Add service methods here
  // Example:
  devAppEx: async (req, res) => {
    console.log("devAppEx fired");
    const body = req.body;
    // console.log("Req body: ", body);
    const id = body.id;

    if (!id) {
      throw new Error("No ID provided");
    }
  
    // const get_example_api = () => ** API CALL HERE **;
    // const [data, error] = await handlePromise(get_example_api);
  
    // if (error) {
    //   throw new Error(error);
    // } else {
    //   return data;
    // }
    
    return "Example data"
  },
};

module.exports = devAppService;
