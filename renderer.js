// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const redis = require('redis')
// only use as listener
const subscriber = redis.createClient()
const client = redis.createClient()
const { accessObjectByPath, assignObjectByPath } = require('./util/objectIO')

subscriber.config("SET","notify-keyspace-events", "KEA")

subscriber.on('connect', () => {
  console.log('redis connected')
})

const getTree = (done) => {
  client.keys('*', (err, rep) => {
    const keys = rep.sort()
    const tree =  {}

    keys.forEach(key => {
      const paths = key.split(':')
      assignObjectByPath(tree, paths, 'xxx')
    })

    return done(tree)
  })
}

const getTreeType = (tree, callback) => {
  client
}

const genTreeHtml = (tree) => {
  const keys = Object.keys(tree)
  const items = keys.map(key => {
    const child = (typeof tree[key] === 'string')? '' : genTreeHtml(tree[key])

    if (child) {
      return `
        <div id="folder">
          <div class="header">${key}</div>
          <div class="child">${child}</div>
        </div>
      `
    } else {
      return `
      <li>${key} ${child}</li>
      `
    }
  }).join('')

  return `
    <ul>${items}</ul>
  `
}


getTree((tree) => {

  window.leftPanel.innerHTML = genTreeHtml(tree)
})

subscriber.on("pmessage", (pattern, channel, message) => {
  // console.log("("+  pattern +")" + " client received message on " + channel + ": " + message)
})

subscriber.psubscribe('__keyspace@0__:xx')
