const { db } = require("../helpers/firebase")

module.exports = async (req,res) => {
    const body = JSON.parse(req.body)
    const LIMIT = 400
    let updated = []
    await admin.firestore()
    .collection(body.coll)
    .where("date", ">=", body.start)
    .where("date", "<=", body.end)
    .limit(LIMIT)
    .get()
    .then((docSnap) => {
      if (docSnap.empty) {
        return res.send(JSON.stringify({message:"No Documents Found"}))
      } else if (docSnap.size === LIMIT){
        return res.send(JSON.stringify({mesage:"Operation aborted. Too many documents to update. Please narrow the date range."}))
      } else {
        console.log("Checking " + docSnap.size + " documents...")
        docSnap.forEach(async (doc) => {
          let obj = new Object(doc.data())
          switch (obj.shift) {
            case 0:
              if (obj.norm === "Siri") {
                obj.shift = "11-7"
                obj.id = `${obj.pos} ${obj.date} 11-7`
                updated.push(obj)
              } else {
                obj.shift = "first"
                obj.id = `${obj.pos} ${obj.date} first`
                updated.push(obj)
              }
              break
            case 1:
              obj.shift = "second"
              obj.id = `${obj.pos} ${obj.date} second`
              updated.push(obj)
              break
            case 2:
              obj.shift = "third"
              obj.id = `${obj.pos} ${obj.date} third`
              updated.push(obj)
              break
            case 3:
              obj.shift = "night"
              obj.id = `${obj.pos} ${obj.date} night`
              updated.push(obj)
              break
            default:
              const lastChar = parseInt(doc.id.charAt(doc.id.length-1))
              if (Number.isInteger(lastChar) && lastChar < 6) {
                // console.log(doc.id)
                obj.id = `${obj.pos} ${obj.date} ${obj.shift}`
                updated.push(obj)
              }
          }
        })
      }
    })
    .catch((error) => {
      console.log(error)
      return res.status(error?.status).json(JSON.stringify(error)).send()
    })

    if (updated.length > 0) {
      console.log("Updating " + updated.length + " documents...")
      for (const i in updated) {
        const post = updated[i]
        await admin.firestore()
        .collection(body.coll)
        .doc(post.id)
        .set(post, {merge: true})
        .catch((error) => {
          console.log(`error: ${error.status} at ${post.id}`)
        })
      }

      console.log("Success!")
      return res.json(JSON.stringify({message:`Updated ${updated.length} postings`})).send()

    } else {
      return res.json(JSON.stringify({message:"No documents updated"})).send()
    }
  }