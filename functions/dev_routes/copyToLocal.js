const { db } = require("../helpers/firebase")
const fs = require("fs")

module.exports = async (req,res) => {
    const body = JSON.parse(req.body)
    const LIMIT = 200
    await db
    .collection(body.coll)
    // .where("date", ">=", body.start)
    // .where("date", "<=", body.end)
    .limit(LIMIT)
    .get()
    .then((docSnap) => {
      if (docSnap.empty) {
        console.log("No matching documents.")
        return res.json(JSON.stringify({message: "No matching documents."})).send()
      } else if (docSnap.size === LIMIT) {
        console.log("Query limit reached.")
        return res.json(JSON.stringify({message: "Query limit reached."})).send()
      } else {
        docSnap.forEach((doc) => {
          let data = doc.data()
          fs.writeFile(`C:\/overtime-management\/json-data\/${body.coll}/${doc.id}.json`, JSON.stringify(data), (err) => {
            if (err) {
              console.log(err)
            }
          })
        })
        return res.json(JSON.stringify({message:`"Success", ${docSnap.size} documents retrieved`})).send()
      }
    })
    .catch((error) => {
      console.log(error)
      res.json(JSON.stringify(error)).send()
    })
  }