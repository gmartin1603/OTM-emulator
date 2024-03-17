/**
 * @module app-service
 * @requires firebase-admin/auth
 * @description This module provides the service for the app cloud function API endpoints
 * @description app-service handles the business logic for /app endpoints
 * @description app-service is called by and returns to app-controller
 * @exports appService
 */
const { handlePromise, handleResponse, writeLog } = require("./common-service");
const { getAuth } = require("firebase-admin/auth");
const { db, admin } = require("../../helpers/firebase");

const appService = {

  getUser: async (req, res) => {
    const body = req.body;
    console.log("Req body: ", body);
    const uid = body.uid;
    console.log("Fetching user data for uid:", uid);
    if (!uid) {
      throw new Error("No user ID provided");
      // throw { message: "No user ID provided", method: "getUser" };
    }

    const get_user_api = () => getAuth().getUser(uid);
    const [user, error] = await handlePromise(get_user_api);

    if (error) {
      throw new Error(error);
    } else {
      return user;
    }
  },

  createUser: async (req, res) => {
    const obj = req.body;
    // console.log(obj);
    if (!obj.auth || !obj.profile) {
      let msg = "";
      if (!obj.auth) {
        msg += "No auth object provided. ";
      }
      if (!obj.profile) {
        msg += "No profile object provided.";
      }
      throw new Error(msg);
    }
    const create_user_auth = () => getAuth().createUser(obj.auth);

    const [userRecord, error] = await handlePromise(create_user_auth);

    if (error) {
      throw error;
    } else {
      // console.log("Successfully created new user: ", userRecord.uid);
      obj.profile.id = userRecord.uid;
      const create_user_profile = () =>
        admin
          .firestore()
          .collection("users")
          .doc(userRecord.uid)
          .set({ ...obj.profile, email: obj.auth.email }, { merge: true });

      const [userProfile, profileError] = await handlePromise(create_user_profile);

      if (profileError) {
        // console.error("Error writing user profile:", profileError);
        
        //TODO: Remove the previously created user on error
        // const delete_user_api = () => getAuth().deleteUser(userRecord.uid);
        // const [_, deleteError] = await handlePromise(delete_user_api);
        // if (deleteError) {
        //   // console.error("Error deleting user:", deleteError);
        //   writeLog("error", {
        //     message: "Error creating profile and deleting user",
        //     user: userRecord.uid,
        //     error: deleteError,
        //   });
        // }
        throw profileError;
      } else {
        let response = {
          message: "Successfully created new user",
          auth: userRecord,
          profile: userProfile,
        }
        return response;
      }
    }
  },

  updateUser: async (req, res) => {
    const obj = req.body;
    const uid = obj.uid;
    if (!uid) {
      throw new Error("No user ID provided");
    }

    const update_profile_api = () => 
      admin
        .firestore()
        .collection("users")
        .doc(uid)
        .set(obj.profile, { merge: true });
    const [user, error] = await handlePromise(update_profile_api);

    if (error) {
      throw new Error(error);
    } else {
      if (obj.auth) {
        const update_auth_api = () => getAuth().updateUser(uid, obj.auth);
        const [auth, authError] = await handlePromise(update_auth_api);
        if (authError) {
          throw new Error(authError);
        } else {
          let response = {
            message: "Successfully updated user",
            auth: auth,
            profile: user,
          }
          return response;
        }
      } else {
        let response = {
          message: "Successfully updated user",
          profile: user,
        }
        return response;
      }
    }
  },
  
  deleteUser: async (req, res) => {
    const uid = req.body.uid;
    if (!uid) {
      throw new Error("No user ID provided");
    }

    const delete_auth_api = () => getAuth().deleteUser(uid);
    const [auth, error] = await handlePromise(delete_auth_api);

    if (error) {
      throw new Error(error);
    } else {
      const delete_profile_api = () => admin.firestore().collection("users").doc(uid).delete();
      const [profile, profileError] = await handlePromise(delete_profile_api);

      if (profileError) {
        throw new Error(profileError);
      } else {
        let response = {
          message: "Successfully deleted user",
          auth: auth,
          profile: profile,
        }
        return response;
      }
    }
  }
};

module.exports = appService;
