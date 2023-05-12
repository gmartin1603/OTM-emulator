const { db } = require("../helpers/firebase")

module.exports = async (req, res) => {
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
  }