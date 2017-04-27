
      /*#######.
     ########",#:
   #########',##".
  ##'##'## .##',##.
   ## ## ## # ##",#.
    ## ## ## ## ##'
     ## ## ## :##
      ## ## ##*/

import { transform } from 'babel-core'
import monolitePlugin from '..'


it(`can take identifier accessors`, () => {

  const source = `
import { set } from 'monolite';
set(state, _ => _.a.b.c)(42);`

  const expected = `
import { set } from 'monolite';
set(state, ['a', 'b', 'c'])(42);`

  const result = transform(source, {
    plugins: [monolitePlugin]
  })

  expect(result.code).toBe(expected)
})


it(`can take literal accessors`, () => {

  const source = `
import { set } from 'monolite';
set(state, _ => _['a'].b['c'])(42);`

  const expected = `
import { set } from 'monolite';
set(state, ['a', 'b', 'c'])(42);`

  const result = transform(source, {
    plugins: [monolitePlugin]
  })

  expect(result.code).toBe(expected)
})


it(`can take uncomputed identifier accessors`, () => {

  const source = `
import { set } from 'monolite';
set(state, _ => _['a'].b[c])(42);`

  const expected = `
import { set } from 'monolite';
set(state, ['a', 'b', c])(42);`

  const result = transform(source, {
    plugins: [monolitePlugin]
  })

  expect(result.code).toBe(expected)
})
