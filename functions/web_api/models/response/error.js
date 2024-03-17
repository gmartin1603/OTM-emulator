const Joi = require('joi');

class ErrorRes {
  constructor({error, method, controller}) {
    this.error = error;
    this.method = method;
    this.controller = controller;
  }

  errorStack() {
    if (this.error.stack) {
      let stack = this.error.stack.split("\n");
      stack.forEach((line, index) => {
        stack[index] = line.trim();
      });
      // console.log("stack", stack)
      return stack;
    } else {
      return null;
    }
  }

  validate() {
    const schema = Joi.object({
      error: Joi.object().required(),
      method: Joi.string().required(),
      controller: Joi.string()
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
    // console.log("this.error", this.error);
    let resObj = {
      status: "error",
      message: this.error.message? this.error.message : "Error response",
      error: this.errorStack()? this.errorStack() : this.error,
      method: this.controller? `${this.controller} => ${this.method}` : this.method
    }
    // console.log("resObj", resObj);

    return resObj;
  }
}

module.exports = ErrorRes;