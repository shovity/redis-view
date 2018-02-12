// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

'use strict'

const redis = require('redis')
// only use as listener
const subscriber = redis.createClient()
const { accessObjectByPath, assignObjectByPath } = require('./util/objectIO')

// redis client use as data getter
let client = null

subscriber.config("SET","notify-keyspace-events", "KEA")


/**
 * LISTENER
 */

subscriber.on('connect', () => {
  console.log('subscriber connected')
})

subscriber.on("pmessage", (pattern, channel, message) => {
  // console.log({ pattern, channel, message })
  const key = channel.split('__:')[1]
  getResutl(key, showResult)
})

global.treeView.addEventListener('click', (e) => {
  const target = e.target
  const key = target.getAttribute('data-key')
  if (key) {
    removeClassName(treeView, 'focus')
    target.className = 'focus'
    getResutl(key, showResult)
    listenKey(key)
  }
})

global.reload.addEventListener('click', () => {
  const url = global.url.value
  connect(url)
})

/**
 *  FUNCTION DEFINED
 */

function removeClassName(targetRoot, className='active') {
  const targets = targetRoot.getElementsByClassName(className)
  for (let i = 0, l = targets.length; i < l; i++) {
    targets[i].className = targets[i].className.replace(className, '')
  }
}

function getTree(done) {
  client.keys('*', (err, rep) => {
    if (err) return done(err)

    const keys = rep.sort()
    const tree =  {}

    keys.forEach(key => {
      const paths = key.split(':')
      assignObjectByPath(tree, paths, key)
    })
    // console.log(tree)
    return done(null, tree)
  })
}

function getResutl(key, done) {
  client.type(key, (err, type) => {
    if (err) return pushAlert(err)

    switch (type) {
      case 'string':
        return client.get(key, (err, result) => {
          done(null, { result, type })
        })

      case 'zset':
        return client.zrange(key, 0, -1, 'WITHSCORES', (err, rep) => {
          if (err) return done(err)
          if (!Array.isArray(rep) || rep.length < 1) return done('zset is null')

          const length = rep.length / 2

          let result = '<table>'
          result += '<tr><th>Member</th><th>Score</th></tr>'
          for (let i = 0, l = rep.length; i < l; i += 2) {
            result += `<tr><td>${rep[i]}</td><td>${rep[i+1]}</td></tr>`
          }
          result += '</table>'

          done(null, { result, type, length })
        })

      case 'hash':
        return client.hgetall(key, (err, rep) => {
          if (err) return done(err)
          if (!rep) return done('hash table is null')

          const keys = Object.keys(rep)
          const length = keys.length
          const trs = keys.map(key => {
            return `<tr><td>${key}</td><td>${rep[key]}</td></tr>`
          }).join('')

          let result = `<table><tr><th>Field</th><th>Value</th></tr>${trs}</table>`

          done(null, { result, type, length })
        })

      default:
        done(`Type "${type}" is not supported yet`)
    }
  })
}

function genTreeHtml(tree) {
  const keys = Object.keys(tree)
  const items = keys.sort((k1, k2) => {
    const bonus1 = typeof tree[k1] === 'string'? 7 : 0
    const bonus2 = typeof tree[k2] === 'string'? 7 : 0

    return (k1 === k2)? bonus1 - bonus2 : (k1 < k2)? bonus1 - bonus2 - 1 : bonus1 - bonus2 + 1
  }).map((key, index) => {
    const child = (typeof tree[key] === 'string')? '' : genTreeHtml(tree[key])

    // gen unique id
    let id = key + index
    while (window[id]) id = id + Math.random()

    if (child) {
      return `
        <div id="folder">

          <label class="header" for="${id}">
            <span class="icon icon-folder"></span>
            ${key}
          </label>

          <input id="${id}" type="checkbox" class="folder-flag"></input>
          <div class="child">${child}</div>
        </div>
      `
    } else {
      return `
      <li data-key="${tree[key]}">${key}</li>
      `
    }
  }).join('')

  return `
    <ul>${items}</ul>
  `
}

function pushAlert(message, type='danger', keepViewer = false) {
  // clean viewer
  if (!keepViewer) global.viewer.innerHTML = ''
  global.alertBox.innerHTML = message
  global.alertBox.className = type
}

function showResult(err, data) {
  // push error message if catch err
  if (err) return pushAlert(err)

  // hide alert
  global.alertBox.className = 'close'

  const { result, type, length } = data

  // show details
  let details = []
  details.push(`Type: ${type || 'not-passed'}`)
  details.push(`Length: ${length || data.result.length}`)
  pushAlert(details.join(' - '), 'primary', true)

  // show reuslt
  if (typeof result === 'string') {
    global.viewer.innerHTML = result
  } else if (Array.isArray(result)) {
    global.viewer.innerHTML = result.map(r => {
      return `${r}<br>`
    }).join('')
  } else {
    global.viewer.innerHTML = JSON.stringify(data)
  }
}

function listenKey(key = '*', db = 0) {
  subscriber.punsubscribe()
  subscriber.psubscribe(`__keyspace@${db}__:${key}`)
  console.log(`__keyspace@${db}__:${key}`)
}

function connect(url) {
  // remove old connection if exists
  if (client) client.quit()

  // create new connect
  pushAlert('Connecting to redis server, make sure connect url look-good', 'primary')
  client = redis.createClient({ url: `//${url}` })

  getTree((err, tree) => {
    if (err) return pushAlert(err)
    global.treeView.innerHTML = genTreeHtml(tree)
  })

  client.on('connect', (a,b,c) => {
    pushAlert('Connect success!!', 'success')
  })

  client.on('error', err => {
    console.log(err.message)
    pushAlert(err)
  })
}

/**
 * BOOT APP
 */

connect('127.0.0.1:6379/0')
