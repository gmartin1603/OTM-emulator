/**
 * @module jobs-service
 * @requires firebase-admin/auth
 * @description This module provides the service for the "/jobs/*" routes 
 * @description jobs-service handles the business logic for /jobs endpoints
 * @description jobs-service is called by and returns to jobs-controller
 * @exports jobsService
 */
const { handlePromise } = require("./common-service");
// Firestore helpers (if needed)
// const { getAuth } = require("firebase-admin/auth");
const { db } = require("../../helpers/firebase");

const jobsService = {
  getJobs: async (req) => {
    const { depts } = req.body;
    // console.log(depts);
    let jobs = [];

    // Get all jobs for each department
    for (const dept of depts) {
      const [result, error] = await handlePromise(() => db.collection(dept).where("id", "!=", "rota").orderBy("id").get());
      if (error) {
        // console.error("Error getting jobs for department:", dept, error);
        throw error;
      } else {
        // console.log("Successfully got jobs for department:", dept);
        result.forEach(doc => {
          jobs.push(doc.data());
        });
      }
    }

    // Order jobs by order with groups by dept
    let res = [];
    let map = {};
    jobs.forEach(job => {
      if (!map[job.dept]) {
        map[job.dept] = [];
      }
      map[job.dept].push(job);
    });

    for (const dept in map) {
      map[dept].sort((a, b) => a.order - b.order);
      res.push(...map[dept]);
    }

    return res;
  },

  getJob: async (req) => {
    const { dept, id } = req.body;

    const get_job_api = () => db.collection(dept).doc(id).get();
    const [result, error] = await handlePromise(get_job_api);

    if (error) {
      // console.error("Error getting job:", error);
      throw error;
    } else {
      // console.log("Successfully got job:", result.data());
      return result.data();
    }
  },

  addJob: async (req) => {
    const { dept, job } = req.body;

    // console.log(job)
    let name = job.label.toLowerCase().replace(/\s/g, "-");
    // Generate unique ID
    let id = `${job.group}-${name}-${Math.random()
        .toString(36)
        .substring(2, 9)}`;
    let ids = [];

    const get_ids_api = () => db.collection(dept).get()
    const [result, ids_error] = await handlePromise(get_ids_api);
    if (ids_error) {
      // console.error("Error getting job IDs:", ids_error);
      throw ids_error;
    } else {
      result.forEach(doc => {
        ids.push(doc.data().id);
      });
    }

    if (ids.includes(id)) {
      let i = 0;
      do {
          console.warn("Generating new ID attempt: " + i);
          id = `${job.group}-${name}-${Math.random()
              .toString(36)
              .substring(2, 9)}`;
          i++;
      } while (ids.includes(id) || i < 100);

      if (i >= 100) {
          console.error("Failed to generate new ID");
          throw new Error("Job not created: Failed to generate new ID");
      } else {
        console.log("New ID generated: " + id);
      }
    }

    job.id = id;
    job.order = ids.length + 1;

    const add_job_api = () => db.collection(dept).doc(job.id).set(job);
    const [jobDoc, error] = await handlePromise(add_job_api);
    if (error) {
      // console.error("Error adding job:", error);
      throw error;
    } else {
      // console.log("Successfully added job:", job);
      return { id: id, ...jobDoc };
    }
  },

  //TODO: Test this function
  updateJob: async (req) => {
    const { dept, job } = req.body;

    const update_job_api = () => db.collection(dept).doc(job.id).set(job, { merge: true });
    const [result, error] = await handlePromise(update_job_api);

    if (error) {
      // console.error("Error updating job:", error);
      throw error;
    } else {
      // console.log("Successfully updated job:", job);
      return result;
    }
  },

  //TODO: Test this function
  deleteJob: async (req) => {
    const { dept, id } = req.body;

    const delete_job_api = () => db.collection(dept).doc(id).delete();
    const [result, error] = await handlePromise(delete_job_api);

    if (error) {
      // console.error("Error deleting job:", error);
      throw error;
    } else {
      // console.log("Successfully deleted job:", id);
      return result;
    }
  }
};

module.exports = jobsService;
