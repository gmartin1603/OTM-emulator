/**
 * @module app-service
 * @requires firebase-admin/auth
 * @description This module provides the service for the app cloud function API endpoints
 * @description app-service handles the business logic for /app endpoints
 * @description app-service is called by and returns to app-controller
 * @exports appService
 */
const { handlePromise, handleResponse } = require("./common-service");
const { getAuth } = require("firebase-admin/auth");
const { db, admin } = require("../../helpers/firebase");

const appService = {
  getUser: async (req, res) => {
    const body = req.body;
    console.log("Req body: ", body);
    const uid = body.uid;
    console.log("Fetching user data for uid:", uid);
    if (!uid) {
      // handleResponse(res, "error", {
      //   error: { message: "uid is required" },
      //   method: "getUser",
      // });
      throw new Error("uid is required");
    }

    const get_user_api = () => getAuth().getUser(uid);

    const [user, error] = await handlePromise(get_user_api);

    if (error) {
      // console.error("Error fetching user data:", error);
      // handleResponse(res, "error", { error: error, method: "getUser" });
      throw new Error(error);
    } else {
      // console.log("Successfully fetched user data:", user);
      // let resObj = {
      //   status: "success",
      //   message: "Successfully fetched user data",
      //   data: user,
      //   method: "getUser",
      // };
      // handleResponse(res, "success", resObj);
      return user;
    }
  },

  createUser: async (req, res) => {
    // let obj = JSON.parse(req.body);
    let obj = req.body;
    console.log(obj);
    if (!obj.auth || !obj.profile) {
      return handleResponse(res, "error", {
        error: { message: "No user data provided" },
        method: "createUser",
      });
    }
    const create_user_auth = () => getAuth().createUser(obj.auth);

    const [userRecord, error] = await handlePromise(create_user_auth);

    if (error) {
      handleResponse(res, "error", { error: error, method: "createUser auth" });
    } else {
      console.log("Successfully created new user: ", userRecord.uid);
      obj.profile.id = userRecord.uid;
      const create_user_profile = () =>
        admin
          .firestore()
          .collection("users")
          .doc(userRecord.uid)
          .set({ ...obj.profile, email: obj.auth.email }, { merge: true });

      const [_, profileError] = await handlePromise(create_user_profile);

      if (profileError) {
        console.error("Error writing user profile:", profileError);
        handleResponse(res, "error", { error: profileError, method: "createUser profile" });
      } else {
        console.log("Successfully created user profile");
        handleResponse(res, "success", {
          status: "success",
          message: "Successfully created new user",
          data: userRecord,
          method: "createUser",
        });
      }
    }
  },
};

module.exports = appService;
