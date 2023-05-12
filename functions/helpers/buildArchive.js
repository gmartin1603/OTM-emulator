const {db} = require('./firebase.js')

module.exports = async (dept, start) => {
  let rota = {};
  let jobs = [];
  const today = new Date(start);
  today.setHours(7)
  console.log(`Today => ${today}`)

  const findMon = (today) => {
    //Daylight Savings check
    const jan = new Date(today.getFullYear(), 0, 1);
    // console.log(`Daylight Savings => ${today.getTimezoneOffset() < jan.getTimezoneOffset()}`)
    let day = 24 * 60 * 60 * 1000
    //  time = today - milliseconds past midnight + 1 hour if today.getTimezoneOffset < jan.getTimezoneOffset
    let time = (today - ((today.getHours() * 60 * 60 * 1000) + (today.getMinutes() * 60 * 1000) + (today.getSeconds() * 1000) + today.getMilliseconds()))+(today.getTimezoneOffset() < jan.getTimezoneOffset()? (60*60*1000) : 0)
    let d = today.getDay()
    if (d === 0) {
      d = 7
    }
    //monday = time - (day of the week * ms in a day) + 1 day in ms
    let mon = time - (d * day) + day

    return new Date(mon)
  }

  const monday = findMon(today)

  const findWeek = (today, start, rotaLength) => {
    let timeSinceStart = today.getTime() - start;
    let weeksSince = timeSinceStart / (24 * 60 * 60 * 1000 * 7);
    let weekNumber = Math.ceil(weeksSince % rotaLength);

    return weekNumber;
  }
  const sortShifts = (shiftObj) => {
    const keys = Object.keys(shiftObj)
    let shiftArr = []
    for (const prop in keys) {
      shiftArr.push(shiftObj[keys[prop]])
    }
    shiftArr.sort((a, b) => {
      if (a.order < b.order) {
          return -1
      }
      if (a.order > b.order) {
          return 1
      }
      return 0
    })
    return shiftArr
  }

  const buildRows = (shift, posts, week) => {
    let arr = []
    jobs.length > 0 &&
    // loop through all rows
    jobs.map((job) => {
      let archiveRow = structuredClone(job)
      // if shift is true in job
      if (job[shift.id]){
        let show = true
        // set color
        let color = shift.color[job.group][0]
        const prevRow = arr[arr.length - 1]
        // if previous job exists
        if (arr.length > 0) {
          if (prevRow.group === job.group) {
            if (prevRow.color === shift.color[job.group][0]) {
              color = shift.color[job.group][1]
            } else {
              color = shift.color[job.group][0]
            }
          }
        }
        archiveRow.data = {
          group: job.group,
          label: job.label,
          color: color,
          id: job.id,
          1:'',
          2:'',
          3:'',
          4:'',
          5:'',
          6:'',
          7:''
        } //mon to sun
        // if not "misc"
        if (job.data) {
          // for each day in the job
          for (const day in job.data) {
            // if the job has rotation data for the shift
            if (job.data[day][shift.id]) {
              // for each week in the rotation
              for (const key in job.data[day][shift.id]) {
                if (key === week.toString()) {
                  // set the archiveRow.data to the rotation data for the week
                  archiveRow.data[day] = rota.fields[shift.id][job.group][job.data[day][shift.id][key]]
                }
              }
            }
          }
        } else {
          show = false
          for (const key in posts) {
            const post = posts[key]
            // console.log(post)
            if (post.shift === shift.id) {
              if (post.pos === job.id) {
                // rowPosts[post.date] = post
                show = true
                let date = new Date(post.date)
                switch (date.getDay()) {
                  case 0:
                    archiveRow.data[7] =  post.id
                    break;
                  default:
                    archiveRow.data[date.getDay()] = post.id
                }
              }
            }
          }
        }

        if (show) {
          arr.push(archiveRow.data)
        }
      }
    })
    return arr
  }

  // Get posts for the week to determine if "misc" row should be shown
  const posts = await db.collection(`${dept}-posts`)
  .where('date', '>=', monday.getTime())
  .where('date', '<=', monday.getTime() + (7 * (24 * 60 * 60 * 1000)))
  .get()
  .then((snapshot) => {
    let obj = {}
    snapshot.forEach((doc) => {
      obj[doc.id] = doc.data()
      db.collection(`${dept}-posts`).doc(doc.id).set({locked: true}, {merge: true})
      .catch((error) => {
        console.log(`Error locking post ${doc.id}`, error)
      })
    });
    return obj
  })
  .catch((err) => {
    console.log('Error getting documents', err);
  });

  await db.collection(dept)
  .orderBy('order')
  .get()
  .then((snapshot) => {
    snapshot.forEach((doc) => {
      if (doc.data().id === "rota") {
        rota = doc.data();
      } else {
        jobs.push(doc.data())
      }
    });
  })
  .catch((err) => {
    console.log('Error getting documents', err);
  });

  let obj = {};

  const week = findWeek(today, rota.start, rota.length);
  const shifts = sortShifts(rota.shifts)

  shifts.map(shift => {
    let rows = buildRows(shift, posts, week)
    obj[shift.id] = {shift: shift, rows: rows}
  })

  return obj
}