const Success = require('../models/response/success');
const ErrorRes = require('../models/response/error');

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

  writeToLog: (type, obj) => {
    const log = {
      type: type,
      obj: obj
    }
    console.log("Writing to log: ", log);
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

  handleError: (res, status, error) => {
    // console.error("Error response: ", error);
    const errorResponse = new ErrorRes(error);
    const [pass, err] = commonService.validateModel(errorResponse);
    if (!pass) {
      return res.status(500).json({ status: "failed", error: err });
    } else {
      const responseObj = errorResponse.responseObj();
      console.log("errorResponse: ", responseObj);
      commonService.writeToLog("error", responseObj);
      return res.status(400).json(responseObj);
    }

  }
}

module.exports = commonService;