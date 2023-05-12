const buildArchive = require("../helpers/buildArchive")
const { db } = require("../helpers/firebase")

module.exports = async (req,res) => {
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
  }