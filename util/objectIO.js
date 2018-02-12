const accessObjectByPath = (source, pathMix) => {
  const paths = (typeof pathMix === 'string')? pathMix.split('.') : pathMix

  let cache = Object.assign(source)
  paths.forEach(path => {
    if (cache[path] === undefined) return
    cache = cache[path]
  })
  return cache
}

// const test = { a: { b: { c: { username: "shovity" } } } }
//
// console.log(accessObjectByPath(test, ['a', 'b', 'c'] ))

const assignObjectByPath = (source, pathMix, value) => {
  const paths = (typeof pathMix === 'string')? pathMix.split('.') : pathMix
  let keeper = source

  paths.forEach((path, index, paths) => {
    if (paths.length === index + 1) {
      keeper[path] = value
    } else {
      if (typeof keeper[path] !== 'object') keeper[path] = {}
      keeper = keeper[path]
    }
  })
}

// let a = {}
//
// assignObjectByPath(a, '1.2.3', 'shovity')
// console.log(a)

module.exports = { accessObjectByPath, assignObjectByPath }
