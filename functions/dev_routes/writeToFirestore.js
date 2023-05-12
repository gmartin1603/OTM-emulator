const { db } = require("../helpers/firebase")
const fs = require("fs")

module.exports = async (req,res) => {
    const body = JSON.parse(req.body)
    fs.readdir(`C:\/Users\/georg\/Documents\/data\/${body.coll}`, (err, docs) => {
      if (err) {
        console.log(err)
        return res.json(JSON.stringify({message:"Error reading local folder"})).send()
      } else {
        docs.forEach((doc) => {
          fs.readFile(`C:\/Users\/georg\/Documents\/data\/${body.coll}/${doc}`, async (err, data) => {
            if (err) {
              console.log(err)
              return res.json(JSON.stringify({message:"Error reading local documents"})).send()
            } else {
              let obj = JSON.parse(data)
              await db
              .collection(body.coll)
              .doc(obj.id)
              .set(obj, {merge:true})
              .catch((error) => {
                console.log(error)
              })
            }
          })
        })
      }
      return res.json({message:"Success"}).send()
    })
  }