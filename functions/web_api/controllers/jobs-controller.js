/**
  * Controller for the jobs cloud function
  * @module jobs-controller
  * @requires module:jobs-service
  * @requires module:common-service
  * @description This module provides the controller for the jobs cloud function API endpoints
  * @description jobs-controller handles execution of /jobs endpoints by calling the appropriate service method
  * @exports jobsController
  */
const jobsService = require("../services/jobs-service");
const { handlePromise, handleResponse } = require("../services/common-service");

const jobsController = async (req, res) => {
  // Get the jobsService method name from the last route of the request URL
  const method = req.url.split("/").pop();

  const jobs_controller_api = () => jobsService[method](req, res);
  const [result, error] = await handlePromise(jobs_controller_api);
  let response = {};

  if (error) {
    // console.error("Error calling jobsService method:", error);
    response = { error: error, controller: "jobs-controller", method: method };

    handleResponse(res, "error", response);
  } else {
    console.log("Successfully called jobsService method:", method);
    response = {
      status: "success",
      message: "Successfully called jobsService method",
      data: result,
      method: `jobs-controller => ${method}`
    };

    handleResponse(res, "success", response);
  }

};

module.exports = jobsController;
