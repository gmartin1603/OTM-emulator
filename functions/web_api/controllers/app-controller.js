/**
 * Controller for the app cloud function
 * @module app-controller
 * @requires module:app-service
 * @description This module provides the controller for the app cloud function API endpoints
 * @description app-controller handles execution of /app endpoints by calling the appropriate service method
 * @exports appController
 */
const appService = require("../services/app-service");
const { handlePromise, handleResponse } = require("../services/common-service");

const appController = async (req, res) => {
  // Get the appService method name from the last route of the request URL
  const method = req.url.split("/").pop();
  // Call the appService method
  const app_controller_api = () => appService[method](req, res);

  const [result, error] = await handlePromise(app_controller_api);
  
  let response = {};
  
  if (error) {
    console.error("Error calling appService method:", error);
    response = { error: error, method: `app-controller => ${method}` };
    handleResponse(res, "error", response);
  } else {
    console.log("Successfully called appService method:", method);
    response = { 
      status: "success", 
      message: "Successfully called appService method", 
      data: result, 
      method: `app-controller => ${method}` 
    };
    handleResponse(res, "success", response);
  }

};

module.exports = appController;
