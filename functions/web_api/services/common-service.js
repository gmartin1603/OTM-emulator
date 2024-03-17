const Success = require('../models/response/success');
const ErrorRes = require('../models/response/error');
const { db } = require('../../helpers/firebase');

const commonService = {
  handlePromise: async (promise) => {
    try {
      const result = await promise();
      return [result, null];
    } catch (error) {
      // console.error("Error in handlePromise: \n", error);
      return [null, error];
    }
  },

  validateModel: (model) => {
    // console.log("Validating model: \n", model);
    const [pass, error] = model.validate();
    // console.log("Validation error: \n", error);
    if (error) {
      return [false, error];
    } else {
      return [true, null];
    }
  },

  handleResponse: (res, status, object) => {
    if (status === "success") {
      return commonService.handleSuccess(res, object);
    } else {
      return commonService.handleError(res, status, object);
    }
  },
  handleSuccess: (res, object) => {
    const successResponse = new Success(object);
    const [pass, error] = commonService.validateModel(successResponse);
    if (!pass) {
      return commonService.handleError(res, 400, {error: {...error}, method: "handleSuccess"});
    } else {
      return res.status(200).json(object);
    }
  },

  handleError: async (res, status, error) => {
    // console.error("Error response: ", error);
    const errorResponse = new ErrorRes(error);
    const [pass, err] = commonService.validateModel(errorResponse);

    if (!pass) {
      return res.status(500).json({ status: "failed", error: err });
    } else {
      const responseObj = errorResponse.responseObj();
      // console.log("errorResponse: ", responseObj);
      await commonService.writeLog("error", responseObj); // writeLog is not a function
      let res_status = Number(status) ? status : 400;
      return res.status(res_status).json(responseObj);
    }
  },

  writeLog: async (type, obj) => {
    const get_logs_api = () => db.collection("logs").doc(type).get();
    const [doc, error] = await commonService.handlePromise(get_logs_api);
    if (error) {
      console.error("Error fetching logs:", error);
      throw error;
    } else {
      let logs = [];
      if (doc.exists) {
        logs = doc.data().logs;
      }
      obj["timestamp"] = new Date();
      logs.push(obj);
      // console.log("Writing to log: ", obj);
      const write_log_api = () => db.collection("logs").doc(type).set({logs: logs}, { merge: true });
      const [_, err] = await commonService.handlePromise(write_log_api);
      if (err) {
        console.error("Error writing to log:", err);
        throw err;
      } else {
        // console.log("Successfully wrote to log");
        return true;
      }
    }
  },

}

module.exports = commonService;