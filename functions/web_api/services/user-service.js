/**
 * @module user-service
 * @requires firebase-admin/auth
 * @description This module provides the service for the "/user/*" routes 
 * @description user-service handles the business logic for /user endpoints
 * @description user-service is called by and returns to user-controller
 * @exports userService
 */
const { handlePromise, handleResponse } = require("./common-service");
// Firestore helpers (if needed)
const { getAuth } = require("firebase-admin/auth");
// const { db, admin } = require("../../helpers/firebase");

const userService = {
  // Add service methods here
  // Example:
  userEx: async (req, res) => {
    console.log("userEx fired");
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

  disableUser: async (req, res) => {
    const body = req.body;
    const uid = body.uid;
    if (!uid) {
      throw new Error("No user ID provided");
    }
    const disable_user_api = () => getAuth().updateUser(uid, { disabled: true });
    const [user, error] = await handlePromise(disable_user_api);
    if (error) {
      throw new Error(error);
    } else {
      return user;
    }
  },
};

module.exports = userService;
