const { db } = require("../helpers/firebase")
const fs = require("fs")

module.exports = async (req,res) => {
    const body = JSON.parse(req.body)
    const MERGE = body.merge
    let total = 0
    let written = 0
    fs.readdir(`C:\/overtime-management\/json-data\/${body.coll}`, (err, docs) => {
      if (err) {
        console.log(err)
        return res.json(JSON.stringify({message:`Error reading local ${body.coll} folder`, error: 3001})).send()
      } else {
        total = docs.length
        docs.forEach((doc) => {
          fs.readFile(`C:\/overtime-management\/json-data\/${body.coll}/${doc}`, async (err, data) => {
            if (err) {
              console.log(err)
              return res.json(JSON.stringify({message:`Error reading local ${body.coll}/${doc} doc`, error: 3002})).send()
            } else {
              // Use the if statement below to write only the documents you want to firestore or true to write all documents
              if (doc === "pkflt.json") {
                console.log("Writing document: " + doc)
                written += 1
                let obj = JSON.parse(data)
                await db
                .collection(body.coll)
                .doc(obj.id)
                .set(obj, {merge: MERGE})
                .catch((error) => {
                  console.log(error)
                })
              }
            }
          })
        })
        return res.json({message:`Found ${total} documents, updated ${written}`}).send()
      }
    })
  }