const Joi = require('joi');

class ErrorRes {
  constructor({error, method}) {
    this.error = error;
    this.method = method;
  }

  validate() {
    const schema = Joi.object({
      error: Joi.object().required(),
      method: Joi.string().required()
    });
    const { err } = schema.validate(this);
    
    if (err) {
      let result = err.details ? err.details[0] : err;
      return [false, result];
    } else {
      return [true, null];
    }
  }

  responseObj() {
    console.log("this.error", this.error);
    let resObj = {
      status: "error",
      message: this.error.message? this.error.message : "Error response",
      details: this.error,
      method: this.method
    }

    console.log("resObj", resObj);

    return resObj;
  }
}

module.exports = ErrorRes;