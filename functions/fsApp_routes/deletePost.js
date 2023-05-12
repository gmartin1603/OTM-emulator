const { db } = require("../helpers/firebase")

module.exports = async (req, res) => {
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
  }