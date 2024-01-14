const functions = require("firebase-functions");
const { getAuth } = require("firebase-admin/auth");
const { db, admin } = require("./helpers/firebase");
const express = require("express");
const cors = require("cors");
const buildArchive = require("./helpers/buildArchive");
const copyToLocal = require("./dev_routes/copyToLocal");
const writeToFirestore = require("./dev_routes/writeToFirestore");
const deleteOldPosts = require("./dev_routes/deleteOldPosts");
const { error } = require("firebase-functions/logger");
require("dotenv").config();

let env = "";
if (process.env.NODE_ENV == "dev") {
    env = "dev";
} else {
    env = "prod";
}
// console.log("env: ", env)
console.log("env: ", env);

//******* userApp start ************** */
//Express init
const app = express();

const corsHandler = cors({ origin: true });

const applyCORS = (handler) => (req, res) => {
    return corsHandler(req, res, (_) => {
        return handler(req, res);
    });
};

const errorResponse = (res, error, code = 500) => {
    let errorMessage = String(error).split("\n")[0];
    console.log("Error Message:", errorMessage);
    if (process.env.NODE_ENV == "dev") {
        console.log(errorMessage);
    }
    return res.json({ code: code, message: errorMessage }).send();
};

const successResponse = (res, message, data) => {
    return res.json({ status: true, message: message, data: data }).send();
};

//get user profile by firebase uid
app.post("/getUser", async (req, res) => {
    let uid = req.body.uid;
    let resObj = {};
    // console.log(uid)

    await admin
        .firestore()
        .collection("users")
        .doc(uid)
        .get()
        .then((doc) => {
            if (!doc.exists) {
                errorResponse(res, "No profile doc found", 1004);
            }
            successResponse(res, "Success", doc.data());
        })
        .catch((error) => {
            errorResponse(res, error);
        });
});

app.post("/newUser", (req, res) => {
    try {
        let obj = JSON.parse(req.body);
        // console.log(obj);
        getAuth()
            .createUser(obj.auth)
            .then((userRecord) => {
                // See the UserRecord reference doc for the contents of userRecord.
                console.log("Successfully created new user:", userRecord.uid);
                obj.profile.id = userRecord.uid;
                admin
                    .firestore()
                    .collection("users")
                    .doc(userRecord.uid)
                    .set({ ...obj.profile, email: obj.auth.email })
                    .then(() => {
                        successResponse(
                            res,
                            `Successfully created user ${obj.profile.dName}`,
                            obj.profile
                        );
                    })
                    .catch((error) => {
                        console.error("Error writing user profile");
                        errorResponse(res, error);
                    });
            })
            .catch((error) => {
                console.error("Error creating new user");
                errorResponse(res, error);
            });
    } catch (error) {
        console.error("Error from catch block");
        errorResponse(res, error);
    }
});

app.post("/updateUser", async (req, res) => {
    let obj = JSON.parse(req.body);
    // let obj = "" // for testing error handling
    try {
        await admin
            .firestore()
            .collection("users")
            .doc(obj.id)
            .set(obj.profile, { merge: true })
            .then(async () => {
                // console.log(obj.id + " Updates Successful")
                if (obj.auth) {
                    await getAuth()
                        .updateUser(obj.id, obj.auth)
                        .then((userRecord) => {
                            // console.log(userRecord.uid+" Updates Successful")
                            successResponse(
                                res,
                                `Successfully updated user: ${obj.profile.dName}, AUTH and PROFILE`
                            );
                        })
                        .catch((error) => {
                            console.log("Error updating user");
                            errorResponse(res, error);
                        });
                } else {
                    successResponse(
                        res,
                        `Successfully updated user: ${obj.profile.dName}'s profile`
                    );
                }
            })
            .catch((error) => {
                console.log("Error updating user profile");
                errorResponse(res, error);
            });
    } catch (error) {
        console.log("Error from catch block");
        errorResponse(res, error);
    }
});

app.post("/deleteUser", async (req, res) => {
    let uid = JSON.parse(req.body).uid;
    let resObj = {};
    // console.log(uid)

    const deleteProfile = () => {
        admin
            .firestore()
            .collection("users")
            .doc(uid)
            .delete()
            .then(() => {
                // console.log(`${uid} Deleted!`)
                successResponse(res, `Successfully deleted user: ${uid}`);
            })
            .catch((error) => {
                console.log("Error deleting user profile");
                errorResponse(res, error);
            });
    };

    //delete auth account
    await getAuth()
        .deleteUser(uid)
        .then(() => {
            console.log("Successfully deleted user auth account");
            // delete firestore profile doc
            deleteProfile();
        })
        .catch((error) => {
            console.log("Error deleting user auth account");
            errorResponse(res, error);
        });
});

// TODO: Test and add error handling
app.post("/resetPass", (req, res) => {
    const { email } = req.body;
    console.log(email);
    getAuth()
        .generatePasswordResetLink(email)
        .then((link) => {
            successResponse(res, "Password reset link sent to email", {
                link: link,
            });
        })
        .catch((error) => {
            errorResponse(res, error);
        });
});

// Set Express app to deploy in Firebse Function "app"
exports.app = functions.https.onRequest(applyCORS(app));

// -------------------------------------------------- //

// ------------------- fsApp start -------------------//

//Express init
const fsApp = express();
// use cors({origin: url}) in all routes

// ------------------- Dev Tools ---------------- //

fsApp.post(
    "/copyToLocal",
    cors({ origin: "http://localhost:3000" }),
    async (req, res) => copyToLocal(req, res)
);

fsApp.post(
    "/writeToFirestore",
    cors({ origin: "http://localhost:3000" }),
    async (req, res) => writeToFirestore(req, res)
);

// fsApp.post('/updatePosts', cors({origin: "http://localhost:3000"}), async (req,res) => (updatePosts(req,res)))

// fsApp.post('/deleteOldPosts', cors({origin: "http://localhost:3000"}), async (req,res) => (deleteOldPosts(req,res)))
// --------------------------------------------------------- //

fsApp.post("/buildArchive", async (req, res) => {
    const { dept, start } = JSON.parse(req.body);
    console.log(dept, start);

    const obj = await buildArchive(dept, start);

    await db
        .collection(dept)
        .doc("rota")
        .collection("archive")
        .doc(`${new Date(start).toDateString()}`)
        .set(obj)
        .then(() => {
            console.log(
                `Doc written to ${dept}/rota/archive/${new Date(
                    start
                ).toDateString()}`
            );
        })
        .catch((error) => {
            console.error("Error writing document: ", message);
            errorResponse(res, error);
        });

    successResponse(
        res,
        `${new Date(start).toDateString()} successfully archived`
    );
});

// Might not need this
fsApp.post("/updateArchive", async (req, res) => {
    const body = JSON.parse(req.body);
    // console.log(body)
    await db
        .collection(body.dept)
        .doc("rota")
        .collection("archive")
        .doc(body.archive)
        .get()
        .then(async (doc) => {
            if (!doc.exists) {
                // console.log('No such document!');
                errorResponse(res, "No such document!", 1004);
            }
            console.log(doc.id);
            let archiveUpdate = structuredClone(doc.data());
            archiveUpdate[body.shift].rows = body.rows;
            await db
                .collection(body.dept)
                .doc("rota")
                .collection("archive")
                .doc(body.archive)
                .set(archiveUpdate)
                .catch((error) => {
                    console.log(error);
                    errorResponse(res, "Error: updating archive doc", 1005);
                });

            successResponse(res, "Archive updated successfully");
        })
        .catch((error) => {
            errorResponse(res, error);
        });
});

fsApp.post("/getJobs", async (req, res) => {
    try {
        let errorStatus = false;
        let depts = JSON.parse(req.body);
        // console.log(depts);
        let jobs = [];
        for (i in depts) {
            await db
                .collection(depts[i])
                .orderBy("order", "asc")
                .get()
                .then((querySnapshot) => {
                    console.log(depts[i]);
                    querySnapshot.forEach((doc) => {
                        jobs.push(doc.data());
                    });
                })
                .catch((error) => {
                    console.error(error);
                    errorStatus = true;
                    throw error;
                });
        }
        // console.log(jobs);
        successResponse(res, "Operation complete", jobs);
    } catch (error) {
        errorResponse(res, error);
    }
});

fsApp.post("/addJob", async (req, res) => {
    let body = JSON.parse(req.body);
    // console.log(body)
    let name = body.label.toLowerCase().replace(/\s/g, "-");
    // Generate unique ID
    let id = `${body.group}-${name}-${Math.random()
        .toString(36)
        .substring(2, 9)}`;
    let ids = [];
    await db
        .collection(body.dept)
        .where("group", "==", body.group)
        .get()
        .then((querySnapshot) => {
            querySnapshot.forEach((doc) => {
                ids.push(doc.id);
            });
        })
        .catch((error) => {
            console.error(error);
        });
    if (ids.includes(id)) {
        let i = 0;
        do {
            console.warn("Generating new ID attempt: " + i);
            id = `${body.group}-${name}-${Math.random()
                .toString(36)
                .substring(2, 9)}`;
            i++;
        } while (ids.includes(id));
        console.log("New ID generated: " + id);
    } else {
        console.log("ID is unique");
    }

    // Add job to users
    let users = body.users;
    let updatedUsers = 0;
    await db
        .collection("users")
        .where("role", "==", "ee")
        .get()
        .then((querySnapshot) => {
            querySnapshot.forEach(async (doc) => {
                if (doc.data().dept[0] === body.dept) {
                    if (users.includes(doc.data().id)) {
                        let update = doc.data().quals;
                        update.push(id);
                        await db
                            .collection("users")
                            .doc(doc.data().id)
                            .set({ quals: update }, { merge: true })
                            .then(() => {
                                console.log(`${doc.data().id} updated`);
                                updatedUsers++;
                            })
                            .catch((error) => {
                                console.log(error);
                            });
                    }
                }
            });
        })
        .catch((error) => {
            console.log(error);
        });

    // create job doc
    let doc = {};
    for (const key in body) {
        if (key !== "users") {
            doc[key] = body[key];
        }
    }
    doc["id"] = id;

    await db
        .collection(doc.dept)
        .doc(id)
        .set(doc, { merge: true })
        .then(() => {
            successResponse(res, `Operation complete ${body.label} added`);
        })
        .catch((error) => {
            errorResponse(res, error);
        });
});

fsApp.post("/editJob", async (req, res) => {
    let { job, users } = JSON.parse(req.body);
    let errorStatus = false;
    let message = [];
    // console.log(job)
    // Update job doc
    await db
        .collection(job.dept)
        .doc(job.id)
        .set(job, { merge: true })
        .then(() => {
            // console.log(`${job.id} updated`);
            message.push(`${job.label} updated`);
        })
        .catch((error) => {
            console.log(error);
            errorStatus = true;
            throw error;
        });

    // Update users
    let updatedUsers = 0;
    await db
        .collection("users")
        .where("role", "==", "ee")
        .get()
        .then((querySnapshot) => {
            querySnapshot.forEach(async (doc) => {
                let user = doc.data();
                let action = "";
                if (user.dept[0] === job.dept) {
                    let update = user.quals;
                    // console.log(user.quals)
                    if (
                        user.quals.includes(job.id) &&
                        !users.includes(user.id)
                    ) {
                        action = "Removed";
                        update = user.quals.filter((id) => id !== job.id);
                    } else if (
                        !user.quals.includes(job.id) &&
                        users.includes(user.id)
                    ) {
                        action = "Added";
                        update.push(job.id);
                    }
                    await db
                        .collection("users")
                        .doc(user.id)
                        .set({ quals: update }, { merge: true })
                        .then(() => {
                            console.log(`${user.id} ${action}`);
                            message.push(`${user.dName} ${action}`);
                            updatedUsers++;
                        })
                        .catch((error) => {
                            console.log(error);
                        });
                }
            });
        })
        .catch((error) => {
            console.log(error);
        });

    successResponse(res, `Operation complete ${message.join(", ")}`);
});

fsApp.post("/setPost", (req, res) => {
    let body = JSON.parse(req.body);
    for (i in body.data) {
        const post = body.data[i];
        db.collection(`${body.dept}-posts`)
            .doc(post.id)
            .set(post, { merge: true })
            .catch((error) => {
                console.log(error);
            });
    }
    if (body.pos.group === "misc" && !body.data[0].lastMod) {
        db.collection(body.dept)
            .doc("rota")
            .collection("archive")
            .doc(body.archive)
            .get()
            .then(async (doc) => {
                let archiveUpdate = {};
                if (doc.exists) {
                    // update existing archive
                    archiveUpdate = structuredClone(doc.data());
                    let rowUpdate = {};
                    let active = false;
                    archiveUpdate[body.data[0].shift].rows.filter((row, i) => {
                        if (row.id === body.pos.id) {
                            active = true;
                            rowUpdate = structuredClone(row);
                            body.data.map((post) => {
                                let day = new Date(post.date).getDay();
                                if (day === 0) {
                                    rowUpdate[7] = post.id;
                                } else {
                                    rowUpdate[day] = post.id;
                                }
                            });
                            // console.log(rowUpdate)
                            archiveUpdate[body.data[0].shift].rows[i] =
                                rowUpdate;
                        }
                    });
                    if (!active) {
                        rowUpdate = {
                            id: body.pos.id,
                            label: body.pos.label,
                            color: body.data[0].color,
                            group: body.pos.group,
                            1: "",
                            2: "",
                            3: "",
                            4: "",
                            5: "",
                            6: "",
                            7: "",
                        };
                        body.data.map((post) => {
                            let day = new Date(post.date).getDay();
                            if (day === 0) {
                                rowUpdate[7] = post.id;
                            } else {
                                rowUpdate[day] = post.id;
                            }
                        });
                        archiveUpdate[body.data[0].shift].rows.push(rowUpdate);
                    }

                    await db
                        .collection(body.dept)
                        .doc("rota")
                        .collection("archive")
                        .doc(body.archive)
                        .set(archiveUpdate)
                        .then(() => {
                            successResponse(
                                res,
                                "Operation complete, archive update"
                            );
                        })
                        .catch((error) => {
                            errorResponse(res, error);
                        });
                } else {
                    // create archive doc
                    const obj = await buildArchive(body.dept, body.archive);

                    await db
                        .collection(body.dept)
                        .doc("rota")
                        .collection("archive")
                        .doc(body.archive)
                        .set(obj)
                        .then(() => {
                            console.log(
                                `Doc written to ${body.dept}/rota/archive/${body.archive}`
                            );
                        })
                        .catch((error) => {
                            console.error("Error writing document: ", error);
                            errorResponse(res, error);
                        });
                    successResponse(
                        res,
                        "Operation complete, archive doc created"
                    );
                }
            })
            .catch((error) => {
                errorResponse(res, error);
            });
    } else {
        successResponse(res, "Operation complete, no archive update");
    }
});

fsApp.post("/deletePost", async (req, res) => {
    let body = JSON.parse(req.body);
    let obj = {};
    await db
        .collection(`${body.dept}-posts`)
        .doc(body.post)
        .delete()
        .then(() => {
            console.log(`${body.post} Deleted!`);
        })
        .catch((error) => {
            res.status(error?.status).send(error);
        });
    if (body.misc) {
        await db
            .collection(body.dept)
            .doc("rota")
            .collection("archive")
            .doc(body.archive)
            .get()
            .then(async (doc) => {
                if (doc.exists) {
                    obj = new Object(doc.data());
                    obj[body.shift].rows.map((row) => {
                        if (row.id === body.pos) {
                            console.log(row.id, body.pos);
                            let active = false;
                            for (const key in row) {
                                if (Number.isInteger(parseInt(key))) {
                                    if (row[key] === body.post) {
                                        console.log("Remove", body.post);
                                        row[key] = "";
                                    } else if (row[key].length > 0) {
                                        active = true;
                                    }
                                }
                            }
                            if (!active) {
                                console.log("Deleting Row", row.id);
                                obj[body.shift].rows = obj[
                                    body.shift
                                ].rows.filter((row) => row.id !== body.pos);
                            }
                        }
                    });
                    await db
                        .collection(body.dept)
                        .doc("rota")
                        .collection("archive")
                        .doc(body.archive)
                        .set(obj)
                        .then(() => {
                            console.log(`${body.archive} Updated!`);
                        })
                        .catch((error) => {
                            console.log(error);
                        });
                    successResponse(res, "Operation complete, archive update");
                } else {
                    errorResponse(res, "Archive doc not found", 1004);
                }
            });
    } else {
        successResponse(res, "Operation complete, no archive update");
    }
});

fsApp.post("/deleteJob", async (req, res) => {
    let body = JSON.parse(req.body);

    for (const i in body.posts) {
        admin
            .firestore()
            .collection(`${body.dept}-posts`)
            .doc(i)
            .delete()
            .then(() => {
                console.log(`${obj.doc} Deleted!`);
            })
            .catch((error) => {
                console.log(error);
            });
    }

    admin
        .firestore()
        .collection(body.dept)
        .doc(body.job)
        .delete()
        .then(() => {
            successResponse(res, `Operation complete ${body.job} deleted`);
        })
        .catch((error) => {
            errorResponse(res, error);
        });
});

fsApp.post("/mkDoc", async (req, res) => {
    let load = JSON.parse(req.body);

    admin
        .firestore()
        .collection(load.dept)
        .doc(load.id)
        .set(load, { merge: true })
        .then(() => {
            successResponse(res, "Operation complete");
        })
        .catch((error) => {
            errorResponse(res, error);
        });
});

fsApp.post("/editRota", async (req, res) => {
  let body = JSON.parse(req.body);
  // console.log(body);
  admin.firestore()
    .collection(body.dept)
    .doc(body.id)
    .set(body, { merge: true })
    .then(() => {
        successResponse(res, "Rota update complete");
    })
    .catch((error) => {
        errorResponse(res, error);
    });
});

fsApp.post("/updateField", async (req, res) => {
    let body = JSON.parse(req.body);

    const batchWrite = () => {
        console.log(body.docs);
        for (const i in body.docs) {
            // update[body.field][body.data[i].id]=body.data[i]
            admin
                .firestore()
                .collection(body.coll)
                .doc(body.docs[i].id)
                .set({ [body.field]: body.docs[i].quals }, { merge: true })
                .catch((error) => {
                    console.log(error);
                });
        }
        successResponse(res, "Operation complete");
    };
    batchWrite();
});

fsApp.post("/updateDoc", async (req, res) => {
    let body = JSON.parse(req.body);

    const batchWrite = () => {
        for (i in body.data) {
            // update[body.field][body.data[i].id]=body.data[i]
            admin
                .firestore()
                .collection(body.coll)
                .doc(body.doc)
                .set(
                    { [body.field]: { [body.data[i].id]: body.data[i] } },
                    { merge: true }
                )
                .catch((error) => {
                    console.log(error);
                });
        }
    };
    batchWrite();
    successResponse(res, `Operation complete ${body.doc} updated`);
});

fsApp.post("/updateBids", async (req, res) => {
    let body = JSON.parse(req.body);

    await db
        .collection(body.coll)
        .doc(body.doc)
        .get()
        .then(async (document) => {
            // TODO: Test this
            // if (!document.exists) {
            //     errorResponse(res, "Document not found", 1004);
            //     return
            // }
            let doc = document.data();
            // console.log(doc)
            for (const key in doc.seg) {
                // if doc.seg[key].bids = undefined
                if (!doc.seg[key].bids) {
                    doc.seg[key]["bids"] = [];
                }
                // if user bid on segment (segs[key])
                if (body.bids.includes(key)) {
                    let arr = [];
                    let mod = false;
                    doc.seg[key].bids.map((obj) => {
                        // if user bid exists => overwrite to update
                        if (obj.name === body.user.name) {
                            mod = true;
                            arr.push(body.user);
                        } else {
                            arr.push(obj);
                        }
                    });
                    // if no prior user bid
                    if (!mod) {
                        arr.push(body.user);
                    }
                    doc.seg[key].bids = arr;
                    // segment not bid on or bid was removed
                } else {
                    console.log("Removed Bid from Segment " + key);
                    let arr = [];
                    doc.seg[key].bids.map((obj) => {
                        if (obj.name !== body.user.name) {
                            arr.push(obj);
                        }
                    });
                    doc.seg[key].bids = arr;
                }
            }
            await db
                .collection(body.coll)
                .doc(body.doc)
                .set(doc, { merge: true })
                .then(() =>
                    successResponse(res, `Selections for ${body.doc} updated`)
                )
                .catch((error) => errorResponse(res, error));
        });
});

fsApp.post("/deleteDoc", async (req, res) => {
    let obj = JSON.parse(req.body);
    await admin
        .firestore()
        .collection(obj.coll)
        .doc(obj.doc)
        .delete()
        .then(() => {
            successResponse(res, `Operation complete ${obj.doc} deleted`);
        })
        .catch((error) => {
            errorResponse(res, error);
        });
});

fsApp.post("/deleteDocField", async (req, res) => {
    let obj = JSON.parse(req.body);
    console.log(obj);

    await admin
        .firestore()
        .collection(obj.coll)
        .doc(obj.doc)
        .get()
        .then((doc) => {
            const data = doc.data();

            let objUpdate = {};
            const removeField = (map) => {
                for (const property in map) {
                    if (property === obj.field.toString()) {
                        console.log(
                            "REMOVED " + obj.field + " from " + obj.doc
                        );
                    } else {
                        objUpdate[property] = map[property];
                    }
                }
            };

            let docUpdate = {};
            const updateNested = () => {
                for (const property in data) {
                    if (property !== obj.nestedObj) {
                        docUpdate[property] = data[property];
                    } else {
                        docUpdate[obj.nestedObj] = objUpdate;
                    }
                }
            };

            const makeChange = async (update) => {
                await admin
                    .firestore()
                    .collection(obj.coll)
                    .doc(obj.doc)
                    .set(update);
            };

            if (obj.nestedObj) {
                removeField(data[obj.nestedObj]);
                updateNested();
                makeChange(docUpdate);
                successResponse(
                    res,
                    `Operation complete ${obj.doc} updated`,
                    docUpdate
                );
            } else {
                removeField(data);
                makeChange(objUpdate);
                successResponse(
                    res,
                    `Operation complete ${obj.doc} updated`,
                    objUpdate
                );
            }
        })
        .catch((error) => {
            errorResponse(res, error);
        });
});

exports.fsApp = functions.https.onRequest(applyCORS(fsApp));

//***************** End FsApp ************* */

//***************** Start Pub/Sub ************* */

// exports.pubSub = functions.pubsub.topic("init").onPublish((context) => {
//   console.log('pubSub Triggered');
//   return true;
// })

// exports.scheduledFunction = functions.pubsub
//     .schedule("every 5 minutes")
//     .onRun((context) => {
//         console.log("This will be run every 5 minutes!");
//         db.collection("logs")
//             .doc("pubSub")
//             .set(
//                 {
//                     [new Date.toDateString()]: "PubSub Triggered",
//                 },
//                 { merge: true }
//             );
//         return null;
//     });

// exports.pubSub = functions.https.onRequest(async (req, res) => {
//     const { dept, start } = JSON.parse(req.body);

//     const obj = await buildArchive(dept, start);

//     await db
//         .collection(dept)
//         .doc("rota")
//         .collection("archive")
//         .doc(`${new Date(start).toDateString()}`)
//         .set(obj)
//         .then(() => {
//             console.log(
//                 `Doc written to ${dept}/rota/archive/${new Date(
//                     start
//                 ).toDateString()}`
//             );
//         })
//         .catch((error) => {
//             console.error("Error writing document: ", error);
//             return res
//                 .json(
//                     JSON.stringify({
//                         message: `Error writing document: ${error}`,
//                     })
//                 )
//                 .send();
//         });

//     return res
//         .json(
//             JSON.stringify({
//                 message: `${new Date(
//                     start
//                 ).toDateString()} successfully archived`,
//             })
//         )
//         .send();
// });

//***************** End Pub/Sub ************* */
