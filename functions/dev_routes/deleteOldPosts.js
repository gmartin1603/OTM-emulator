const { db } = require("../helpers/firebase")

module.exports = async (req,res) => {
    const body = JSON.parse(req.body)
    const LIMIT = 400
    let deleted = []
    await db
    .collection(body.coll)
    .where("date", ">=", body.start)
    .where("date", "<=", body.end)
    .limit(LIMIT)
    .get()
    .then((docSnap) => {
      if (docSnap.empty) {
        console.log("No Documents Found")
        return res.json({message:"No Documents Found"}).sendStatus(200)
      } else if (docSnap.size === LIMIT){
        console.log("Too many documents to update. Please narrow the date range.")
        return res.send(JSON.stringify({mesage:"Operation aborted. Too many documents to update. Please narrow the date range."}))
      } else {
        console.log("filtering...", docSnap.size, "documents...")
        docSnap.forEach((doc) => {
          const lastChar = parseInt(doc.id.charAt(doc.id.length-1))
          if (Number.isInteger(lastChar) && lastChar < 6) {
            deleted.push(doc.id)
            // console.log(doc.id)
          }
        })
      }
    })
    .catch((error) => {
      console.log(error)
      res.status(error?.status).send(JSON.stringify(error))
    })

    if (deleted.length > 0) {
    console.log("Deleting " + deleted.length + " documents...")
    for (const i in deleted) {
      // console.log(deleted[i])
      await db
      .collection(body.coll)
      .doc(deleted[i])
      .delete()
      .catch((error) => {
        console.log(`error: ${error.status} at ${deleted[i]}`)
      })
    }
    } else {
      console.log("No documents deleted")
    }

    // console.log("Success!")
    return res.json(JSON.stringify({message:`Deleted ${deleted.length} postings`})).send()
  }