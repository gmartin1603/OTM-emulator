const {db} = require("../helpers/firebase")

module.exports = async (req, res) => {
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
}