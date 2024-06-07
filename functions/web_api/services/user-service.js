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
const { db, admin } = require("../../helpers/firebase");

const userService = {
  /**
   * Fetches user data from Firebase Auth and Firestore
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body object { uid: {String}, email: {String}
   * @requires req.body - Field 'uid' or 'email' required
   * @returns {Object} - User data object as { auth: {Object}, profile: {Object} }
   */
  getUser: async (req) => {
    const body = req.body;
    console.log("Req body: ", body);
    const uid = body.uid;
    const email = body.email;
    // console.log("Fetching user data for uid:", uid);
    if (!uid && !email) {
      throw new Error("User ID or email required to fetch user data");
      // throw { message: "No user ID provided", method: "getUser" };
    }
    
    let user;
    let error;
    if (uid) {
      const get_user_api = () => getAuth().getUser(uid);
      [user, error] = await handlePromise(get_user_api);
    } else {
      const get_user_by_email_api = () => getAuth().getUserByEmail(email);
      [user, error] = await handlePromise(get_user_by_email_api);
    }

    const get_user_profile_api = () => db.collection("users").doc(user.uid).get();
    const [profile, profileError] = await handlePromise(get_user_profile_api);

    if (error) {
      // console.error("Error fetching user data:", error);
      throw new Error(error);
    } 
    if (profileError) {
      // console.error("Error fetching user profile data:", profileError);
      throw new Error(profileError);
    } else {
      return { auth: user, profile: profile.data() };
    }
  },

  newUser: async (req) => {
    const body = req.body;
    // console.log(body);
    if (!body.auth || !body.profile) {
      let msg = "";
      if (!body.auth) {
        msg += "No auth object provided. ";
      }
      if (!body.profile) {
        msg += "No profile object provided.";
      }
      throw new Error(msg);
    }
    const create_user_auth = () => getAuth().createUser(body.auth);

    const [userRecord, error] = await handlePromise(create_user_auth);

    if (error) {
      throw error;
    }

    // console.log("Successfully created new user: ", userRecord.uid);
    body.profile.id = userRecord.uid;
    const create_user_profile = () => db.collection("users").doc(userRecord.uid).set({ ...body.profile, email: body.auth.email }, { merge: true });

    const [userProfile, profileError] = await handlePromise(create_user_profile);

    if (profileError) {
      // console.error("Error writing user profile:", profileError);
      throw new Error(profileError);
    } else {
      return { auth: userRecord, profile: userProfile };
    }
  },

  getVerificationLink: async (req) => {
    const body = req.body;
    const email = body.email;
    // console.log("Sending verification email to: ", email);
    const send_verification_email_api = () => getAuth().generateEmailVerificationLink(email)
    const [link, error] = await handlePromise(send_verification_email_api);
    
    if (error) {
      console.error("Error sending verification email:", error);
      throw error;
    } else {
      // console.log("Successfully sent verification email");
      return { link };
    }
  },

  getPasswordResetLink: async (req) => {
    const body = req.body;
    const email = body.email;
    // console.log("Sending password reset email to: ", email);
    const send_password_reset_email_api = () => getAuth().generatePasswordResetLink(email);
    const [link, error] = await handlePromise(send_password_reset_email_api);

    if (error) {
      console.error("Error sending password reset email:", error);
      throw error;
    } else {
      // console.log("Successfully sent password reset email");
      return { link };
    }
  },

  updateUser: async (req, res) => {
    const obj = req.body;
    const uid = obj.uid;
    if (!uid) {
      throw new Error("No user ID provided");
    }

    const update_profile_api = () => 
      db
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

  disableUser: async (req, res) => {
    let body = req.body;
    const uid = body.uid;
    if (!uid) {
      throw new Error("No user ID provided");
    } else if (body.disabled === undefined) {
      body.disabled = true;
    }

    const disable_user_api = () => getAuth().updateUser(uid, { disabled: body.disabled });
    const [user, error] = await handlePromise(disable_user_api);

    if (error) {
      throw new Error(error);
    } else {
      return user;
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
      const delete_profile_api = () => db.collection("users").doc(uid).delete();
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

module.exports = userService;
