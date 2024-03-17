/**
  * Controller for the user cloud function
  * @module user-controller
  * @requires module:user-service
  * @requires module:common-service
  * @description This module provides the controller for the user cloud function API endpoints
  * @description user-controller handles execution of /user endpoints by calling the appropriate service method
  * @exports userController
  */
const userService = require("../services/user-service");
const { handlePromise, handleResponse } = require("../services/common-service");

const userController = async (req, res) => {
  // Get the userService method name from the last route of the request URL
  const method = req.url.split("/").pop();

  const user_controller_api = () => userService[method](req, res);
  const [result, error] = await handlePromise(user_controller_api);
  let response = {};

  if (error) {
    // console.error("Error calling userService method:", error);
    response = { error: error, controller: "user-controller", method: method };

    handleResponse(res, "error", response);
  } else {
    console.log("Successfully called userService method:", method);
    response = {
      status: "success",
      message: "Successfully called userService method",
      data: result,
      method: `user-controller => ${method}`
    };

    handleResponse(res, "success", response);
  }

};

module.exports = userController;
