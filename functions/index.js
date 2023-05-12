const functions = require("firebase-functions");
const { getAuth } = require('firebase-admin/auth');
const { db, admin } = require('./helpers/firebase');
const express = require('express');
const cors = require('cors');
const buildArchive = require("./helpers/buildArchive");
const copyToLocal = require("./dev_routes/copyToLocal");
const writeToFirestore = require("./dev_routes/writeToFirestore");
const deleteOldPosts = require("./dev_routes/deleteOldPosts");
require('dotenv').config()

let url = ""
if (process.env.NODE_ENV == 'dev') {
  url = "http://localhost:3000"
} else {
  url = "https://overtime-management-83008.web.app"
}

//******* userApp start ************** */
//Express init
const app = express();
app.use('*' ,cors({origin: url}));


app.get('/resetPass', cors({origin: url}), (req, res) => {
  const email = req.body
  getAuth()
  .generatePasswordResetLink(email)
  .then((link) => {
    res.send("Check registered e-mail for reset link")
  })
})

app.post('/newUser',cors({origin: url}), (req, res) => {
  let obj = JSON.parse(req.body);
  console.log(obj);

  getAuth()
  .createUser(obj.auth)
  .then((userRecord) => {
    // See the UserRecord reference doc for the contents of userRecord.
    console.log('Successfully created new user:', userRecord.uid)
    obj.profile.id = userRecord.uid
    admin.firestore()
    .collection("users")
    .doc(userRecord.uid)
    .set(obj.profile)
    .then(() => {
      res.json(JSON.stringify({message: "User profile written successfully"})).send()
    })
    .catch((error) => {
      console.log('Error creating new user profile:', error)
      return res.json(JSON.stringify({error: error, message: "Error creating new user profile"})).send()
    });
  })
  .catch((error) => {
    console.log('Error creating new user:', error)
    res.send(error)
  });
})

app.post('/updateUser', cors({origin: url}), async (req, res) => {
  let obj = JSON.parse(req.body)
  console.log(obj)

  await admin.firestore()
  .collection("users")
  .doc(obj.id)
  .set(obj.profile,{merge:true})
  .then(async () => {
    console.log(obj.id + " Updates Successful")
    if (obj.auth) {
      await getAuth()
      .updateUser(obj.id, obj.auth)
      .then((userRecord) => {
        console.log(userRecord.uid+" Updates Successful")
        res.send("Updates Successful")
      })
      .catch((error) => {
        res.send(error.code)
      })
    } else {
      res.send("Updates Successful")
    }
  })
  .catch((error) => {
    res.send(error.code)
  })
})

//get user profile by firebase uid
app.get('/getUser', cors({origin: url}), async (req, res) => {
  let uid = req.body;
  console.log(uid)

  await admin.firestore()
  .collection("users")
  .doc(uid).get()
  .then(doc => {
    let profile = doc.data()
    res.send(profile)
  })
});

app.post('/deleteUser', cors({origin: url}), async (req, res) => {
  //delete firestore profile doc
  const deleteProfile = () => {
  admin.firestore()
  .collection("users")
  .doc(req.body).delete()
  .then(() => {
    // console.log(`${req.body} Deleted!`)
    res.send("Operation Complete")
  })
  .catch((error) => {
    res.status(error?.status).send(error)
  })
  }
  //delete auth account
  await getAuth()
  .deleteUser(req.body)
  .then(() => {
    console.log('Successfully deleted user auth account');
    deleteProfile()
  })
  .catch((error) => {
    // console.log('Error deleting user:', error);
    res.send(error.message)
  });
})

// Set Express app to deploy in Firebse Function "app"
exports.app = functions.https.onRequest(app)
// -------------------------------------------------- //
// ------------------- fsApp start -------------------//

//Express init
const fsApp = express()

// ------------------- Dev Tools ---------------- //

// fsApp.post('/copyToLocal', cors({origin: "http://localhost:3000"}), async (req,res) => (copyToLocal(req,res)))

// fsApp.post('/writeToFirestore', cors({origin: "http://localhost:3000"}), async (req,res) => (writeToFirestore(req,res)))

// fsApp.post('/updatePosts', cors({origin: "http://localhost:3000"}), async (req,res) => (updatePosts(req,res)))

// fsApp.post('/deleteOldPosts', cors({origin: "http://localhost:3000"}), async (req,res) => (deleteOldPosts(req,res)))
// --------------------------------------------------------- //

fsApp.post('/buildArchive', cors({origin: url}), async (req,res) => {
  const {dept, start} = JSON.parse(req.body)

  const obj = await buildArchive(dept, start)

  await db.collection(dept).doc('rota').collection('archive').doc(`${new Date(start).toDateString()}`).set(obj)
  .then(() => {
    console.log(`Doc written to ${dept}/rota/archive/${new Date(start).toDateString()}`)
  })
  .catch((error) => {
    console.error('Error writing document: ', error);
    return res.json(JSON.stringify({message: `Error writing document: ${error}`})).send()
  });

  return res.json(JSON.stringify({message: `${new Date(start).toDateString()} successfully archived`})).send()
})

fsApp.post('/updateArchive', cors({origin: url}), async (req, res) => {
  const body = JSON.parse(req.body)
  // console.log(body)
  await db.collection(body.dept)
  .doc('rota')
  .collection('archive')
  .doc(body.archive)
  .get()
  .then(async (doc) => {
      console.log(doc.id)
      let archiveUpdate = structuredClone(doc.data())
      archiveUpdate[body.shift].rows = body.rows
      await db.collection(body.dept)
      .doc('rota')
      .collection('archive')
      .doc(body.archive)
      .set(archiveUpdate)
      .catch((error) => {
          console.log(error)
          return res.json(JSON.stringify({error: error, message: "Error updating archive"})).send()
      })

      return res.json(JSON.stringify({message: "Archive updated successfully"})).send()
  })
  .catch((error) => {
      console.log(error)
      return res.json(JSON.stringify({error: error, message: "Error getting archive"})).send()
  })
})

fsApp.post('/setPost', cors({origin: url}), (req, res) => {
  let body = JSON.parse(req.body)
  for (i in body.data) {
    const post = body.data[i]
    db
    .collection(`${body.dept}-posts`)
    .doc(post.id)
    .set(post,{merge:true})
    .catch((error) => {
      console.log(error)
    })
  }
  if (body.pos.group === "misc" && !body.data[0].lastMod) {
    db
    .collection(body.dept)
    .doc('rota')
    .collection('archive')
    .doc(body.archive)
    .get()
    .then(async (doc) => {
      let archiveUpdate = {}
      if (doc.exists) {
        // update existing archive
        archiveUpdate = structuredClone(doc.data())
        let rowUpdate = {}
        let active = false
        archiveUpdate[body.data[0].shift].rows.filter((row,i) => {
          if (row.id === body.pos.id) {
            active = true
            rowUpdate = structuredClone(row)
            body.data.map((post) => {
              let day = new Date(post.date).getDay()
              if (day === 0) {
                rowUpdate[7] = post.id
              } else {
                rowUpdate[day] = post.id
              }
            })
            // console.log(rowUpdate)
            archiveUpdate[body.data[0].shift].rows[i] = rowUpdate
          }
        })
        if (!active) {
          rowUpdate = {
            id: body.pos.id,
            label: body.pos.label,
            color: body.data[0].color,
            group: body.pos.group,
            1: '',
            2: '',
            3: '',
            4: '',
            5: '',
            6: '',
            7: ''
          }
          body.data.map((post) => {
            let day = new Date(post.date).getDay()
            if (day === 0) {
              rowUpdate[7] = post.id
            } else {
              rowUpdate[day] = post.id
            }
          })
          archiveUpdate[body.data[0].shift].rows.push(rowUpdate)
        }

        await db
        .collection(body.dept)
        .doc('rota')
        .collection('archive')
        .doc(body.archive)
        .set(archiveUpdate)
        .then(() => {
          return res.json(JSON.stringify({message: "Operation complete, archive update"})).send()
        })
        .catch((error) => {
          return res.json(JSON.stringify({message: "Error", error: error})).send()
        })
      } else {
        // create archive doc
        const obj = await buildArchive(body.dept, body.archive)

        await db.collection(body.dept).doc('rota').collection('archive').doc(body.archive).set(obj)
        .then(() => {
          console.log(`Doc written to ${body.dept}/rota/archive/${body.archive}`)
        })
        .catch((error) => {
          console.error('Error writing document: ', error);
          return res.json(JSON.stringify({message: "Error writing archive doc", error: error})).send()
        });
        return res.json(JSON.stringify({message: "Operation complete archive doc created"})).send()
      }
    })
    .catch((error) => {
      console.log(error)
      return res.json(JSON.stringify({message: "Error getting archive doc", error: error})).send()
    })
  } else {
    return res.json(JSON.stringify({message: "Operation complete, no archive update"})).send()
  }
})

fsApp.post('/deletePost', cors({origin: url}), async (req, res) => {
  let body = JSON.parse(req.body)
  let obj = {}
  await db
  .collection(`${body.dept}-posts`)
  .doc(body.post).delete()
  .then(() => {
    console.log(`${body.post} Deleted!`)
  })
  .catch((error) => {
    res.status(error?.status).send(error)
  })
  if (body.misc) {
    await db
    .collection(body.dept)
    .doc('rota')
    .collection('archive')
    .doc(body.archive)
    .get()
    .then(async (doc) => {
      if (doc.exists) {
        obj = new Object(doc.data())
        obj[body.shift].rows.map((row) => {
          if (row.id === body.pos) {
            console.log(row.id, body.pos)
            let active = false
            for (const key in row) {
              if (Number.isInteger(parseInt(key))) {
                if (row[key] === body.post) {
                  console.log("Remove", body.post)
                  row[key] = ""
                } else if (row[key].length > 0) {
                  active = true
                }
              }
            }
            if (!active) {
              console.log("Deleting Row", row.id)
              obj[body.shift].rows = obj[body.shift].rows.filter((row) => row.id !== body.pos)
            }
          }
        })
        await db
        .collection(body.dept)
        .doc('rota')
        .collection('archive')
        .doc(body.archive)
        .set(obj)
        .then(() => {
          console.log(`${body.archive} Updated!`)
        })
        .catch((error) => {
          console.log(error)
        })
        return res.json(JSON.stringify({message: "Operation Complete, archive updated"})).send()
      } else {
        return res.json(JSON.stringify({message: "No Archive Document Found"})).send()
      }
    })
  } else {
    return res.json(JSON.stringify({message: "Operation Complete, no archive update"})).send()
  }
})

fsApp.post('/deleteJob', cors({origin: url}), async (req,res) => {
  let body = JSON.parse(req.body)

  for (const i in body.posts) {
    admin.firestore()
    .collection(`${body.dept}-posts`)
    .doc(i)
    .delete()
    .then(() => {
      console.log(`${obj.doc} Deleted!`)
    })
    .catch((error) => {
      console.log(error)
    })
  }

  admin.firestore()
  .collection(body.dept)
  .doc(body.job)
  .delete()
  .then(() => {
    console.log(`${body.job} Deleted!`)
    res.send("Job Delete Complete")
  })
  .catch((error) => {
    res.status(error?.status).send(error)
  })
})

fsApp.post('/mkDoc', cors({origin: url}), async (req,res) => {
  let load = JSON.parse(req.body)

  admin.firestore()
  .collection(load.dept)
  .doc(load.id)
  .set(load, {merge:true})
  .then(() => {
    res.send(`Operation complete`)
  })
  .catch((error) => {
    console.log(error.message)
    res.send(error)
  })
})

fsApp.post('/editRota', cors({origin: url}), async (req,res) => {
  let body = JSON.parse(req.body)
  admin.firestore()
  .collection(body.dept)
  .doc(body.id)
  .set(body, {merge:true})
  .then(() => {
    res.send(`Operation complete`)
  })
  .catch((error) => {
    console.log(error.message)
    res.send(error)
  })
})

fsApp.post('/updateField', cors({origin: url}), async (req,res) => {
  let body = JSON.parse(req.body)

  const batchWrite = () => {
    console.log(body.docs)
    for (const i in body.docs) {
      // update[body.field][body.data[i].id]=body.data[i]
      admin.firestore()
      .collection(body.coll)
      .doc(body.docs[i].id)
      .set({[body.field]: body.docs[i].quals},{merge:true})
      .catch((error) => {
        console.log(error)
        res.send(error)
      })
    }
    return (
      res.send(`Update to doc(s) complete`)
    )
  }
  batchWrite()
})

fsApp.post('/updateDoc', cors({origin: url}), async (req,res) => {
  let body = JSON.parse(req.body)

  const batchWrite = () => {
    for (i in body.data) {
      // update[body.field][body.data[i].id]=body.data[i]
      admin.firestore()
      .collection(body.coll)
      .doc(body.doc)
      .set({[body.field]:{[body.data[i].id]:body.data[i]}},{merge:true})
      .catch((error) => res.send(error))
    }
  }
  batchWrite()
  res.send("update complete")
})

fsApp.post('/updateBids', cors({origin: url}), async (req,res) => {
  let body = JSON.parse(req.body)

    await db.collection(body.coll)
    .doc(body.doc)
    .get()
    .then(async (document) => {
      let doc = document.data()
      // console.log(doc)
      for (const key in doc.seg) {
        // if doc.seg[key].bids = undefined
        if (!doc.seg[key].bids) {
          doc.seg[key]["bids"] = []
        }
        // if user bid on segment (segs[key])
        if (body.bids.includes(key)) {
          let arr = []
          let mod = false
          doc.seg[key].bids.map(obj => {
            // if user bid exists => overwrite to update
            if (obj.name === body.user.name) {
              mod = true
              arr.push(body.user)
            } else {
              arr.push(obj)
            }
          })
          // if no prior user bid
          if (!mod) {
            arr.push(body.user)
          }
          doc.seg[key].bids = arr
          // segment not bid on or bid was removed
        } else {
          console.log("Removed Bid from Segment "+key)
          let arr = []
          doc.seg[key].bids.map(obj => {
            if (obj.name !== body.user.name) {
              arr.push(obj)
              }
            })
            doc.seg[key].bids = arr
        }
      }
      await db.collection(body.coll)
      .doc(body.doc)
      .set(doc,{merge:true})
      .then(() => res.json(JSON.stringify({message: "Signature added to posting"})).send())
      .catch((error) => res.json(JSON.stringify({message: "Error adding signature", error: error})).send())
  })
})

fsApp.post('/deleteDoc', cors({origin: url}), async (req, res) => {
  let obj = JSON.parse(req.body)
  await admin.firestore()
  .collection(obj.coll)
  .doc(obj.doc).delete()
  .then(() => {
    console.log(`${obj.doc} Deleted!`)
    res.send("Operation Complete")
  })
  .catch((error) => {
    res.status(error?.status).send(error)
  })
})

fsApp.post('/deleteDocField', cors({origin: url}), async (req, res) => {
  let obj = JSON.parse(req.body)
  console.log(obj)

  await admin.firestore()
  .collection(obj.coll)
  .doc(obj.doc).get()
  .then((doc) => {
    const data = doc.data()

    let objUpdate = {}
    const removeField = (map) => {
      for (const property in map) {
        if(property === obj.field.toString()) {
          console.log("REMOVED "+obj.field+" from "+obj.doc)
        } else {
          objUpdate[property] = map[property]
        }
      }
    }

    let docUpdate = {}
    const updateNested = () => {
      for (const property in data) {
        if (property !== obj.nestedObj) {
          docUpdate[property] = data[property]
        } else {
          docUpdate[obj.nestedObj] = objUpdate
        }
      }
    }

    const makeChange = async (update) => {
      await admin.firestore()
      .collection(obj.coll)
      .doc(obj.doc).set(update)
    };

    if (obj.nestedObj) {
      removeField(data[obj.nestedObj])
      updateNested()
      makeChange(docUpdate)
      res.send(docUpdate)
    } else {
      removeField(data)
      makeChange(objUpdate)
      res.send(objUpdate)
    }
  })
  .catch((error) => {
    res.send(error)
  })
})

exports.fsApp = functions.https.onRequest(fsApp)

//***************** End FsApp ************* */

//***************** Start Pub/Sub ************* */

// exports.pubSub = functions.pubsub.topic("init").onPublish((context) => {
//   console.log('pubSub Triggered');
//   return true;
// })
exports.pubSub = functions.https.onRequest(async (req, res) => {
  const {dept, start} = JSON.parse(req.body)

  const obj = await buildArchive(dept, start)

  await db.collection(dept).doc('rota').collection('archive').doc(`${new Date(start).toDateString()}`).set(obj)
  .then(() => {
    console.log(`Doc written to ${dept}/rota/archive/${new Date(start).toDateString()}`)
  })
  .catch((error) => {
    console.error('Error writing document: ', error);
    return res.json(JSON.stringify({message: `Error writing document: ${error}`})).send()
  });

  return res.json(JSON.stringify({message: `${new Date(start).toDateString()} successfully archived`})).send()
})

//***************** End Pub/Sub ************* */
